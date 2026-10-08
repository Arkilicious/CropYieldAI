let yieldChart = null;
let cropChart = null;
let environmentChart = null;


/* =========================================================
   CROPYIELD AI CHART SYSTEM
   ========================================================= */

function getChartTheme() {
    const isLight =
        document.documentElement.getAttribute("data-theme") === "light";

    return {
        text: isLight ? "#52635a" : "#8fa198",
        muted: isLight ? "#7a8981" : "#718078",
        grid: isLight
            ? "rgba(24, 65, 40, .08)"
            : "rgba(255,255,255,.055)",

        lime: isLight ? "#5f9f27" : "#b8ef55",
        limeSoft: isLight
            ? "rgba(95,159,39,.16)"
            : "rgba(184,239,85,.14)",

        green: isLight ? "#347a50" : "#70c58a",
        greenSoft: isLight
            ? "rgba(52,122,80,.14)"
            : "rgba(112,197,138,.14)",

        amber: isLight ? "#b67a16" : "#f7c85b",
        amberSoft: isLight
            ? "rgba(182,122,22,.14)"
            : "rgba(247,200,91,.14)",

        red: isLight ? "#c34d46" : "#ff746d",

        tooltipBackground: isLight
            ? "rgba(255,255,255,.97)"
            : "rgba(7,24,16,.97)",

        tooltipTitle: isLight ? "#17231c" : "#f2f7f3",
        tooltipBody: isLight ? "#4e6257" : "#b8ef55",
        tooltipBorder: isLight
            ? "rgba(95,159,39,.20)"
            : "rgba(184,239,85,.18)"
    };
}


function getChartPalette() {
    const theme = getChartTheme();

    return [
        theme.lime,
        theme.green,
        theme.amber,
        "#79a7ff",
        "#c58cff",
        "#ef8eae",
        "#58c9c1",
        "#d98c5f"
    ];
}


const common = {
    responsive: true,
    maintainAspectRatio: false,

    interaction: {
        intersect: false,
        mode: "index"
    },

    animation: {
        duration: 700,
        easing: "easeOutQuart"
    },

    elements: {
        line: {
            tension: 0.38,
            borderWidth: 2
        },

        point: {
            radius: 0,
            hoverRadius: 5,
            hoverBorderWidth: 2
        }
    },

    plugins: {
        legend: {
            display: false
        },

        tooltip: {
            backgroundColor: "rgba(7,24,16,.97)",
            titleColor: "#f2f7f3",
            bodyColor: "#b8ef55",
            borderColor: "rgba(184,239,85,.18)",
            borderWidth: 1,
            padding: 12,
            cornerRadius: 10,
            displayColors: true,

            titleFont: {
                family: "DM Sans",
                size: 11,
                weight: "600"
            },

            bodyFont: {
                family: "DM Sans",
                size: 11,
                weight: "500"
            }
        }
    },

    scales: {
        x: {
            border: {
                display: false
            },

            grid: {
                display: false
            },

            ticks: {
                color: "#718078",

                font: {
                    family: "DM Sans",
                    size: 9
                },

                maxRotation: 0,
                autoSkip: true,
                maxTicksLimit: 8
            }
        },

        y: {
            border: {
                display: false
            },

            grid: {
                color: "rgba(255,255,255,.055)",
                drawTicks: false
            },

            ticks: {
                color: "#718078",

                font: {
                    family: "DM Sans",
                    size: 9
                },

                padding: 8
            }
        }
    }
};


/* =========================================================
   THEME-AWARE CHART OPTIONS
   ========================================================= */

function applyChartTheme(options) {
    const theme = getChartTheme();

    const config = {
        ...options
    };

    if (!config.plugins) {
        config.plugins = {};
    }

    if (!config.plugins.tooltip) {
        config.plugins.tooltip = {};
    }

    config.plugins.tooltip = {
        ...config.plugins.tooltip,

        backgroundColor:
            theme.tooltipBackground,

        titleColor:
            theme.tooltipTitle,

        bodyColor:
            theme.tooltipBody,

        borderColor:
            theme.tooltipBorder
    };

    if (config.scales) {
        config.scales = {
            ...config.scales
        };

        if (config.scales.x) {
            config.scales.x = {
                ...config.scales.x,

                ticks: {
                    ...(config.scales.x.ticks || {}),
                    color: theme.text
                },

                grid: {
                    ...(config.scales.x.grid || {})
                }
            };
        }

        if (config.scales.y) {
            config.scales.y = {
                ...config.scales.y,

                ticks: {
                    ...(config.scales.y.ticks || {}),
                    color: theme.text
                },

                grid: {
                    ...(config.scales.y.grid || {}),
                    color: theme.grid
                }
            };
        }
    }

    return config;
}


/* =========================================================
   API HELPER
   ========================================================= */

function getJSON(url) {
    return fetch(url, {
        headers: {
            "Accept": "application/json"
        }
    }).then(function(response) {
        if (!response.ok) {
            throw new Error("HTTP " + response.status);
        }

        return response.json();
    });
}


/* =========================================================
   DASHBOARD
   ========================================================= */

function loadDashboard() {
    console.log("CY Dashboard: loading...");

    getJSON("/api/analytics")
        .then(function(data) {
            console.log("CY Dashboard data:", data);

            updateDashboardKPIs(data);
            updateEnvironmentalSignals(data);
            createDashboardCharts(data);
        })
        .catch(function(error) {
            console.error("CY Dashboard error:", error);
        });
}


function updateDashboardKPIs(data) {
    const totalPred =
        document.getElementById("totalPred");

    const avgYield =
        document.getElementById("avgYield");

    if (totalPred) {
        totalPred.textContent =
            data.total || 0;
    }

    if (avgYield) {
        avgYield.innerHTML =
            Number(
                data.avg_yield || 0
            ).toFixed(2) +
            ' <i>t/ha</i>';
    }
}


function updateEnvironmentalSignals(data) {
    /*
     * The API returns arrays ordered by prediction date.
     * The final item therefore represents the latest prediction.
     */

    if (!data.total) {
        setEnvironmentalValue(
            "rainVal",
            "--"
        );

        setEnvironmentalValue(
            "tempVal",
            "--"
        );

        setEnvironmentalValue(
            "humVal",
            "--"
        );

        setMeter(
            "rainMeter",
            0
        );

        setMeter(
            "tempMeter",
            0
        );

        setMeter(
            "humMeter",
            0
        );

        return;
    }

    const lastIndex =
        data.total - 1;

    const rainfall =
        Number(
            (data.rainfall || [])[lastIndex] || 0
        );

    const temperature =
        Number(
            (data.temperature || [])[lastIndex] || 0
        );

    const humidity =
        Number(
            (data.humidity || [])[lastIndex] || 0
        );

    setEnvironmentalValue(
        "rainVal",
        rainfall.toFixed(1) + " mm"
    );

    setEnvironmentalValue(
        "tempVal",
        temperature.toFixed(1) + " °C"
    );

    setEnvironmentalValue(
        "humVal",
        humidity.toFixed(1) + " %"
    );

    setMeter(
        "rainMeter",
        clamp(
            (rainfall / 3000) * 100,
            0,
            100
        )
    );

    setMeter(
        "tempMeter",
        clamp(
            (temperature / 50) * 100,
            0,
            100
        )
    );

    setMeter(
        "humMeter",
        clamp(
            humidity,
            0,
            100
        )
    );
}


function setEnvironmentalValue(id, value) {
    const element =
        document.getElementById(id);

    if (element) {
        element.textContent =
            value;
    }
}


function setMeter(id, percentage) {
    const element =
        document.getElementById(id);

    if (element) {
        element.style.width =
            clamp(
                Number(percentage) || 0,
                0,
                100
            ) + "%";
    }
}


function clamp(value, min, max) {
    return Math.min(
        Math.max(
            value,
            min
        ),
        max
    );
}


/* =========================================================
   DASHBOARD CHARTS
   ========================================================= */

function createDashboardCharts(data) {
    if (!data.total) {
        console.log(
            "CY Dashboard: no prediction records available."
        );

        destroyDashboardCharts();

        return;
    }

    if (typeof Chart === "undefined") {
        console.error(
            "CY Dashboard: Chart.js is not available."
        );

        return;
    }

    destroyDashboardCharts();

    const theme =
        getChartTheme();


    /* -----------------------------------------------------
       YIELD INTELLIGENCE
       ----------------------------------------------------- */

    const yieldCanvas =
        document.getElementById(
            "yieldChart"
        );

    if (yieldCanvas) {
        const gradient =
            yieldCanvas
                .getContext("2d")
                .createLinearGradient(
                    0,
                    0,
                    0,
                    240
                );

        gradient.addColorStop(
            0,
            theme.limeSoft
        );

        gradient.addColorStop(
            1,
            "rgba(184,239,85,0)"
        );

        yieldChart =
            new Chart(
                yieldCanvas,
                {
                    type: "line",

                    data: {
                        labels:
                            data.labels || [],

                        datasets: [{
                            label:
                                "Yield (t/ha)",

                            data:
                                data.yields || [],

                            tension:
                                0.38,

                            fill:
                                true,

                            backgroundColor:
                                gradient,

                            borderColor:
                                theme.lime,

                            borderWidth:
                                2,

                            pointRadius:
                                0,

                            pointHoverRadius:
                                5,

                            pointHoverBackgroundColor:
                                theme.lime,

                            pointHoverBorderColor:
                                "#ffffff",

                            pointHoverBorderWidth:
                                2
                        }]
                    },

                    options:
                        applyChartTheme({
                            ...common,

                            plugins: {
                                ...common.plugins,

                                legend: {
                                    display:
                                        false
                                },

                                tooltip: {
                                    callbacks: {
                                        label:
                                            function(
                                                context
                                            ) {
                                                return (
                                                    " Yield: " +
                                                    Number(
                                                        context.raw || 0
                                                    ).toFixed(2) +
                                                    " t/ha"
                                                );
                                            }
                                    }
                                }
                            }
                        })
                }
            );

        console.log(
            "CY Dashboard: yield chart created."
        );
    }


    /* -----------------------------------------------------
       CROP MIX
       ----------------------------------------------------- */

    const cropCanvas =
        document.getElementById(
            "cropChart"
        );

    if (cropCanvas) {
        const cropCounts =
            data.crop_counts || {};

        const labels =
            Object.keys(
                cropCounts
            );

        const values =
            Object.values(
                cropCounts
            );

        const palette =
            getChartPalette();

        cropChart =
            new Chart(
                cropCanvas,
                {
                    type: "doughnut",

                    data: {
                        labels:
                            labels,

                        datasets: [{
                            data:
                                values,

                            backgroundColor:
                                palette.slice(
                                    0,
                                    labels.length
                                ),

                            borderWidth:
                                0,

                            hoverOffset:
                                8,

                            spacing:
                                3,

                            borderRadius:
                                5
                        }]
                    },

                    options: {
                        responsive:
                            true,

                        maintainAspectRatio:
                            false,

                        cutout:
                            "68%",

                        animation: {
                            duration:
                                800,

                            easing:
                                "easeOutQuart"
                        },

                        plugins: {
                            legend: {
                                display:
                                    true,

                                position:
                                    "bottom",

                                labels: {
                                    color:
                                        theme.text,

                                    boxWidth:
                                        9,

                                    boxHeight:
                                        9,

                                    padding:
                                        12,

                                    usePointStyle:
                                        true,

                                    pointStyle:
                                        "circle",

                                    font: {
                                        family:
                                            "DM Sans",

                                        size:
                                            9
                                    }
                                }
                            },

                            tooltip: {
                                backgroundColor:
                                    theme.tooltipBackground,

                                titleColor:
                                    theme.tooltipTitle,

                                bodyColor:
                                    theme.tooltipBody,

                                borderColor:
                                    theme.tooltipBorder,

                                borderWidth:
                                    1,

                                padding:
                                    12,

                                cornerRadius:
                                    10,

                                callbacks: {
                                    label:
                                        function(
                                            context
                                        ) {
                                            const total =
                                                values.reduce(
                                                    function(
                                                        sum,
                                                        value
                                                    ) {
                                                        return (
                                                            sum +
                                                            Number(
                                                                value || 0
                                                            )
                                                        );
                                                    },
                                                    0
                                                );

                                            const value =
                                                Number(
                                                    context.raw || 0
                                                );

                                            const percentage =
                                                total > 0
                                                    ? (
                                                        value /
                                                        total *
                                                        100
                                                    ).toFixed(1)
                                                    : "0.0";

                                            return (
                                                " " +
                                                context.label +
                                                ": " +
                                                value +
                                                " (" +
                                                percentage +
                                                "%)"
                                            );
                                        }
                                }
                            }
                        }
                    }
                }
            );

        console.log(
            "CY Dashboard: crop chart created."
        );
    }
}


function destroyDashboardCharts() {
    if (yieldChart) {
        yieldChart.destroy();
        yieldChart = null;
    }

    if (cropChart) {
        cropChart.destroy();
        cropChart = null;
    }
}


/* =========================================================
   ANALYTICS PAGE
   ========================================================= */

function loadAnalytics() {
    console.log(
        "CY Analytics: starting..."
    );

    getJSON("/api/analytics")
        .then(function(data) {
            console.log(
                "CY Analytics data:",
                data
            );

            const total =
                document.getElementById(
                    "analyticsTotal"
                );

            const avgYield =
                document.getElementById(
                    "analyticsAvgYield"
                );

            const avgRain =
                document.getElementById(
                    "analyticsAvgRain"
                );

            const highRisk =
                document.getElementById(
                    "analyticsHighRisk"
                );


            if (total) {
                total.textContent =
                    data.total || 0;
            }


            if (avgYield) {
                avgYield.innerHTML =
                    Number(
                        data.avg_yield || 0
                    ).toFixed(2) +
                    ' <i>t/ha</i>';
            }


            if (avgRain) {
                avgRain.innerHTML =
                    Number(
                        data.avg_rainfall || 0
                    ).toFixed(1) +
                    ' <i>mm</i>';
            }


            if (highRisk) {
                highRisk.textContent =
                    data.high_risk || 0;
            }


            if (!data.total) {
                console.log(
                    "CY Analytics: no prediction records."
                );

                destroyAnalyticsCharts();

                return;
            }


            if (typeof Chart === "undefined") {
                console.error(
                    "Chart.js is not available."
                );

                return;
            }


            destroyAnalyticsCharts();


            const theme =
                getChartTheme();


            /* ------------------------------------------------
               ANALYTICS YIELD CHART
               ------------------------------------------------ */

            const yieldCanvas =
                document.getElementById(
                    "analyticsYield"
                );

            if (yieldCanvas) {
                const gradient =
                    yieldCanvas
                        .getContext("2d")
                        .createLinearGradient(
                            0,
                            0,
                            0,
                            260
                        );

                gradient.addColorStop(
                    0,
                    theme.limeSoft
                );

                gradient.addColorStop(
                    1,
                    "rgba(184,239,85,0)"
                );

                yieldChart =
                    new Chart(
                        yieldCanvas,
                        {
                            type: "line",

                            data: {
                                labels:
                                    data.labels || [],

                                datasets: [{
                                    label:
                                        "Yield (t/ha)",

                                    data:
                                        data.yields || [],

                                    tension:
                                        0.38,

                                    fill:
                                        true,

                                    backgroundColor:
                                        gradient,

                                    borderColor:
                                        theme.lime,

                                    borderWidth:
                                        2.2,

                                    pointRadius:
                                        0,

                                    pointHoverRadius:
                                        5,

                                    pointHoverBackgroundColor:
                                        theme.lime,

                                    pointHoverBorderColor:
                                        "#ffffff",

                                    pointHoverBorderWidth:
                                        2
                                }]
                            },

                            options:
                                applyChartTheme({
                                    ...common,

                                    plugins: {
                                        ...common.plugins,

                                        legend: {
                                            display:
                                                false
                                        },

                                        tooltip: {
                                            callbacks: {
                                                label:
                                                    function(
                                                        context
                                                    ) {
                                                        return (
                                                            " Yield: " +
                                                            Number(
                                                                context.raw || 0
                                                            ).toFixed(2) +
                                                            " t/ha"
                                                        );
                                                    }
                                            }
                                        }
                                    }
                                })
                        }
                    );

                console.log(
                    "CY Analytics: yield chart created."
                );
            }


            /* ------------------------------------------------
               ANALYTICS CROP DISTRIBUTION
               ------------------------------------------------ */

            const cropCanvas =
                document.getElementById(
                    "analyticsCrop"
                );

            if (cropCanvas) {
                const cropCounts =
                    data.crop_counts || {};

                const labels =
                    Object.keys(
                        cropCounts
                    );

                const values =
                    Object.values(
                        cropCounts
                    );

                const palette =
                    getChartPalette();

                cropChart =
                    new Chart(
                        cropCanvas,
                        {
                            type: "doughnut",

                            data: {
                                labels:
                                    labels,

                                datasets: [{
                                    data:
                                        values,

                                    backgroundColor:
                                        palette.slice(
                                            0,
                                            labels.length
                                        ),

                                    borderWidth:
                                        0,

                                    spacing:
                                        3,

                                    hoverOffset:
                                        9,

                                    borderRadius:
                                        5
                                }]
                            },

                            options: {
                                responsive:
                                    true,

                                maintainAspectRatio:
                                    false,

                                cutout:
                                    "70%",

                                animation: {
                                    duration:
                                        800,

                                    easing:
                                        "easeOutQuart"
                                },

                                plugins: {
                                    legend: {
                                        display:
                                            true,

                                        position:
                                            "bottom",

                                        labels: {
                                            color:
                                                theme.text,

                                            boxWidth:
                                                9,

                                            boxHeight:
                                                9,

                                            padding:
                                                13,

                                            usePointStyle:
                                                true,

                                            pointStyle:
                                                "circle",

                                            font: {
                                                family:
                                                    "DM Sans",

                                                size:
                                                    9
                                            }
                                        }
                                    },

                                    tooltip: {
                                        backgroundColor:
                                            theme.tooltipBackground,

                                        titleColor:
                                            theme.tooltipTitle,

                                        bodyColor:
                                            theme.tooltipBody,

                                        borderColor:
                                            theme.tooltipBorder,

                                        borderWidth:
                                            1,

                                        padding:
                                            12,

                                        cornerRadius:
                                            10,

                                        callbacks: {
                                            label:
                                                function(
                                                    context
                                                ) {
                                                    const total =
                                                        values.reduce(
                                                            function(
                                                                sum,
                                                                value
                                                            ) {
                                                                return (
                                                                    sum +
                                                                    Number(
                                                                        value || 0
                                                                    )
                                                                );
                                                            },
                                                            0
                                                        );

                                                    const value =
                                                        Number(
                                                            context.raw || 0
                                                        );

                                                    const percentage =
                                                        total > 0
                                                            ? (
                                                                value /
                                                                total *
                                                                100
                                                            ).toFixed(1)
                                                            : "0.0";

                                                    return (
                                                        " " +
                                                        context.label +
                                                        ": " +
                                                        value +
                                                        " (" +
                                                        percentage +
                                                        "%)"
                                                    );
                                                }
                                        }
                                    }
                                }
                            }
                        }
                    );

                console.log(
                    "CY Analytics: crop chart created."
                );
            }


            /* ------------------------------------------------
               ENVIRONMENT CHART
               ------------------------------------------------ */

            const environmentCanvas =
                document.getElementById(
                    "environmentChart"
                );

            if (environmentCanvas) {
                environmentChart =
                    new Chart(
                        environmentCanvas,
                        {
                            type: "line",

                            data: {
                                labels:
                                    data.labels || [],

                                datasets: [
                                    {
                                        label:
                                            "Rainfall (mm)",

                                        data:
                                            data.rainfall || [],

                                        tension:
                                            0.38,

                                        borderColor:
                                            theme.lime,

                                        backgroundColor:
                                            theme.limeSoft,

                                        borderWidth:
                                            2,

                                        pointRadius:
                                            0,

                                        pointHoverRadius:
                                            5,

                                        pointHoverBackgroundColor:
                                            theme.lime,

                                        pointHoverBorderColor:
                                            "#ffffff",

                                        pointHoverBorderWidth:
                                            2
                                    },

                                    {
                                        label:
                                            "Temperature (°C)",

                                        data:
                                            data.temperature || [],

                                        tension:
                                            0.38,

                                        borderColor:
                                            theme.amber,

                                        backgroundColor:
                                            theme.amberSoft,

                                        borderWidth:
                                            2,

                                        pointRadius:
                                            0,

                                        pointHoverRadius:
                                            5,

                                        pointHoverBackgroundColor:
                                            theme.amber,

                                        pointHoverBorderColor:
                                            "#ffffff",

                                        pointHoverBorderWidth:
                                            2
                                    }
                                ]
                            },

                            options:
                                applyChartTheme({
                                    ...common,

                                    plugins: {
                                        ...common.plugins,

                                        legend: {
                                            display:
                                                true,

                                            position:
                                                "top",

                                            align:
                                                "end",

                                            labels: {
                                                color:
                                                    theme.text,

                                                boxWidth:
                                                    8,

                                                boxHeight:
                                                    8,

                                                padding:
                                                    12,

                                                usePointStyle:
                                                    true,

                                                pointStyle:
                                                    "circle",

                                                font: {
                                                    family:
                                                        "DM Sans",

                                                    size:
                                                        9,

                                                    weight:
                                                        "500"
                                                }
                                            }
                                        },

                                        tooltip: {
                                            callbacks: {
                                                label:
                                                    function(
                                                        context
                                                    ) {
                                                        const value =
                                                            Number(
                                                                context.raw || 0
                                                            ).toFixed(1);

                                                        return (
                                                            " " +
                                                            context.dataset.label +
                                                            ": " +
                                                            value +
                                                            (
                                                                context.datasetIndex === 0
                                                                    ? " mm"
                                                                    : " °C"
                                                            )
                                                        );
                                                    }
                                            }
                                        }
                                    }
                                })
                        }
                    );

                console.log(
                    "CY Analytics: environment chart created."
                );
            }
        })
        .catch(function(error) {
            console.error(
                "CY Analytics error:",
                error
            );
        });
}


function destroyAnalyticsCharts() {
    if (yieldChart) {
        yieldChart.destroy();
        yieldChart = null;
    }

    if (cropChart) {
        cropChart.destroy();
        cropChart = null;
    }

    if (environmentChart) {
        environmentChart.destroy();
        environmentChart = null;
    }
}


/* =========================================================
   APPLICATION STARTUP
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function() {
        console.log(
            "CY App loaded."
        );

        console.log(
            "Chart.js:",
            typeof Chart
        );

        console.log(
            "Dashboard enabled:",
            window.CY_DASH
        );

        console.log(
            "Analytics enabled:",
            window.CY_ANALYTICS
        );


        /*
         * Dashboard page
         */

        if (window.CY_DASH) {
            loadDashboard();

            /*
             * Refresh dashboard data every 30 seconds.
             */

            setInterval(
                loadDashboard,
                30000
            );
        }


        /*
         * Analytics page
         */

        if (window.CY_ANALYTICS) {
            loadAnalytics();

            /*
             * Keep analytics current as well.
             */

            setInterval(
                loadAnalytics,
                30000
            );
        }
    }
);