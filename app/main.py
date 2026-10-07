from datetime import datetime,timedelta
import csv,io,json
from flask import Blueprint,render_template,request,redirect,url_for,flash,jsonify,Response,send_file
from flask_login import login_required,current_user
from sqlalchemy import func, or_
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from .models import db,User,Prediction
from ml.predict import predict,metrics,model_ready
bp=Blueprint('main',__name__)
CROPS=['Maize','Rice','Cassava','Yam','Beans','Groundnut','Tomato']; SOILS=['Loamy','Clay','Sandy','Silty','Peaty']

def admin_required(): return current_user.is_authenticated and current_user.role=='admin'
@bp.route('/')
def landing(): return render_template('landing.html')
@bp.route('/dashboard')
@login_required
def dashboard():
    qs=Prediction.query.filter_by(user_id=current_user.id).order_by(Prediction.created_at.desc())
    return render_template('dashboard.html',predictions=qs.limit(8).all(),total=qs.count(),metrics=metrics())
@bp.route('/predict',methods=['GET','POST'])
@login_required
def prediction():
    result=None
    if request.method=='POST':
        try:
            data={'crop_type':request.form['crop_type'],'soil_type':request.form['soil_type'],'rainfall':float(request.form['rainfall']),'temperature':float(request.form['temperature']),'humidity':float(request.form['humidity'])}
            if data['crop_type'] not in CROPS or data['soil_type'] not in SOILS: raise ValueError('Select valid crop and soil.')
            if not (100<=data['rainfall']<=3000 and 5<=data['temperature']<=50 and 1<=data['humidity']<=100): raise ValueError('Check the environmental values.')
            result=predict(data)
            p=Prediction(user_id=current_user.id,**data,**{k:result[k] for k in ['yield_tph','range_low','range_high','risk_score','risk_label','condition_score']},recommendations='|'.join(result['recommendations']))
            db.session.add(p); db.session.commit(); result['id']=p.id
        except Exception as e: flash(str(e),'error')
    return render_template('predict.html',crops=CROPS,soils=SOILS,result=result)
@bp.route('/history')
@login_required
def history(): return render_template('history.html',predictions=Prediction.query.filter_by(user_id=current_user.id).order_by(Prediction.created_at.desc()).all())
@bp.route('/analytics')
@login_required
def analytics():
    # Admins get system-wide analytics; regular users get their own predictions.
    scope_label = 'System-wide analytics' if current_user.role == 'admin' else 'Your field analytics'
    return render_template('analytics.html', scope_label=scope_label)
@bp.route('/model-lab')
@login_required
def model_lab(): return render_template('model_lab.html',metrics=metrics())
@bp.route('/profile',methods=['GET','POST'])
@login_required
def profile():
    if request.method=='POST': current_user.name=request.form.get('name',current_user.name); db.session.commit(); flash('Profile updated.','success')
    return render_template('profile.html')
@bp.route('/export/csv')
@login_required
def export_csv():
    out=io.StringIO(); w=csv.writer(out); w.writerow(['Date','Crop','Soil','Rainfall mm','Temperature C','Humidity %','Predicted Yield t/ha','Risk','Condition Score'])
    for p in Prediction.query.filter_by(user_id=current_user.id).order_by(Prediction.created_at.desc()): w.writerow([p.created_at.strftime('%Y-%m-%d %H:%M'),p.crop_type,p.soil_type,p.rainfall,p.temperature,p.humidity,p.yield_tph,p.risk_label,p.condition_score])
    return Response(out.getvalue(),mimetype='text/csv',headers={'Content-Disposition':'attachment; filename=cropyield_history.csv'})
@bp.route('/report/<int:pid>')
@login_required
def report(pid):
    p=Prediction.query.get_or_404(pid)
    if p.user_id!=current_user.id and not admin_required(): return ('Forbidden',403)
    buf=io.BytesIO(); c=canvas.Canvas(buf,pagesize=A4); c.setTitle('CropYield AI Prediction Report'); y=790
    c.setFont('Helvetica-Bold',20); c.drawString(48,y,'CropYield AI'); y-=30; c.setFont('Helvetica',11); c.drawString(48,y,'AI Crop Yield Prediction Report'); y-=35
    for label,val in [('User',p.user.name),('Date',p.created_at.strftime('%Y-%m-%d %H:%M')),('Crop',p.crop_type),('Soil',p.soil_type),('Rainfall',f'{p.rainfall:.0f} mm'),('Temperature',f'{p.temperature:.1f} C'),('Humidity',f'{p.humidity:.0f}%'),('Predicted yield',f'{p.yield_tph:.2f} t/ha'),('Expected range',f'{p.range_low:.2f} - {p.range_high:.2f} t/ha'),('Risk',f'{p.risk_label} ({p.risk_score}/100)'),('Condition score',f'{p.condition_score}/100')]: c.drawString(55,y,f'{label}: {val}'); y-=22
    y-=10; c.setFont('Helvetica-Bold',12); c.drawString(55,y,'Decision support recommendations'); y-=20; c.setFont('Helvetica',10)
    for rec in p.recommendations.split('|'): c.drawString(65,y,'• '+rec); y-=17
    y-=20; c.setFont('Helvetica-Oblique',8); c.drawString(55,y,'Prototype decision-support output. Model quality depends on training data quality and coverage.')
    c.save(); buf.seek(0); return send_file(buf,as_attachment=True,download_name=f'prediction-{pid}.pdf',mimetype='application/pdf')

@bp.route('/admin')
@login_required
def admin():
    if not admin_required(): return ('Forbidden',403)
    q=request.args.get('q','').strip()
    status=request.args.get('status','all')
    role=request.args.get('role','all')
    users_q=User.query
    if q:
        like=f'%{q}%'
        users_q=users_q.filter(or_(User.name.ilike(like),User.email.ilike(like)))
    if status=='active': users_q=users_q.filter_by(active=True)
    elif status=='suspended': users_q=users_q.filter_by(active=False)
    if role in ('admin','user'): users_q=users_q.filter_by(role=role)
    users=users_q.order_by(User.created_at.desc()).all()
    predictions=Prediction.query.order_by(Prediction.created_at.desc()).limit(50).all()
    all_predictions=Prediction.query.all()
    active_users=User.query.filter_by(active=True).count()
    high_risk=sum(1 for p in all_predictions if (p.risk_label or '').lower()=='high')
    avg_yield=round(sum(p.yield_tph for p in all_predictions)/len(all_predictions),2) if all_predictions else 0
    health={'database':True,'model':model_ready(),'users':active_users,'predictions':len(all_predictions)}
    return render_template('admin.html',users=users,predictions=predictions,metrics=metrics(),
                           total_users=User.query.count(),active_users=active_users,total_predictions=len(all_predictions),
                           high_risk=high_risk,avg_yield=avg_yield,health=health,q=q,status=status,role=role)
@bp.route('/admin/retrain',methods=['POST'])
@login_required
def retrain():
    if not admin_required(): return ('Forbidden',403)
    from ml.train import train_and_save
    train_and_save(); flash('Model retrained successfully with the current training dataset.','success'); return redirect(url_for('main.admin'))
@bp.route('/admin/user/<int:uid>/toggle',methods=['POST'])
@login_required
def toggle_user(uid):
    if not admin_required(): return ('Forbidden',403)
    u=User.query.get_or_404(uid); u.active=not u.active; db.session.commit(); return redirect(url_for('main.admin'))
@bp.route('/admin/user/<int:uid>/delete',methods=['POST'])
@login_required
def delete_user(uid):
    if not admin_required(): return ('Forbidden',403)
    u=User.query.get_or_404(uid)
    if u.id==current_user.id: flash('You cannot delete your own account.','error')
    else: db.session.delete(u); db.session.commit()
    return redirect(url_for('main.admin'))

@bp.route('/admin/prediction/<int:pid>/delete',methods=['POST'])
@login_required
def delete_prediction(pid):
    if not admin_required(): return ('Forbidden',403)
    p=Prediction.query.get_or_404(pid)
    db.session.delete(p); db.session.commit()
    flash('Prediction record deleted.','success')
    return redirect(url_for('main.admin'))

@bp.route('/api/health')
def health(): return jsonify(status='ok',model_ready=model_ready(),time=datetime.utcnow().isoformat())
@bp.route('/api/live')
@login_required
def live():
    now=datetime.utcnow(); start=now-timedelta(hours=24)
    rows=Prediction.query.filter(Prediction.created_at>=start).all()
    allp=Prediction.query.all(); users=User.query.filter_by(active=True).count()
    bycrop={c:0 for c in CROPS}
    for p in allp: bycrop[p.crop_type]=bycrop.get(p.crop_type,0)+1
    return jsonify(time=now.isoformat(),predictions_24h=len(rows),total_predictions=len(allp),active_users=users,avg_yield=round(sum(p.yield_tph for p in allp)/len(allp),2) if allp else 0,by_crop=bycrop,model=metrics())
@bp.route('/api/predict',methods=['POST'])
@login_required
def api_predict():
    data=request.get_json(force=True); result=predict(data); return jsonify(result)
@bp.route('/api/analytics')
@login_required
def api_analytics():
    # Admins should not see an empty chart simply because the seeded/demo
    # predictions belong to another account. Regular users see only their data.
    if current_user.role == 'admin':
        rows = Prediction.query.order_by(Prediction.created_at.asc()).all()
    else:
        rows = Prediction.query.filter_by(user_id=current_user.id).order_by(Prediction.created_at.asc()).all()

    crop_counts = {}
    for p in rows:
        crop_counts[p.crop_type] = crop_counts.get(p.crop_type, 0) + 1

    avg_yield = round(sum(p.yield_tph for p in rows) / len(rows), 2) if rows else 0
    avg_rainfall = round(sum(p.rainfall for p in rows) / len(rows), 1) if rows else 0
    avg_temperature = round(sum(p.temperature for p in rows) / len(rows), 1) if rows else 0
    high_risk = sum(1 for p in rows if (p.risk_label or '').lower() == 'high')

    return jsonify(
        scope='system' if current_user.role == 'admin' else 'user',
        total=len(rows),
        avg_yield=avg_yield,
        avg_rainfall=avg_rainfall,
        avg_temperature=avg_temperature,
        high_risk=high_risk,
        labels=[p.created_at.strftime('%d %b') for p in rows],
        yields=[p.yield_tph for p in rows],
        rainfall=[p.rainfall for p in rows],
        temperature=[p.temperature for p in rows],
        humidity=[p.humidity for p in rows],
        crop_counts=crop_counts
    )
