let yieldChart = null;
let cropChart = null;
let environmentChart = null;

const common = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            display: false
        }
    },
    scales: {
        x: {
            grid: {
                display: false
            },
            ticks: {
                color: "#718078",
                font: {
                    size: 9
                }
            }
        },
        y: {
            grid: {
                color: "rgba(255,255,255,.06)"
            },
            ticks: {
                color: "#718078",
                font: {
                    size: 9
                }
            }
        }
    }
};

function getJSON(url) {
    return fetch(url)
        .then(function(response) {
            if (!response.ok) {
                throw new Error("HTTP " + response.status);
            }

            return response.json();
        });
}

function loadAnalytics() {
    console.log("CY Analytics: starting...");

    getJSON("/api/analytics")
        .then(function(data) {
            console.log("CY Analytics data:", data);

            const total = document.getElementById("analyticsTotal");
            const avgYield = document.getElementById("analyticsAvgYield");
            const avgRain = document.getElementById("analyticsAvgRain");
            const highRisk = document.getElementById("analyticsHighRisk");

            if (total) {
                total.textContent = data.total || 0;
            }

            if (avgYield) {
                avgYield.innerHTML =
                    Number(data.avg_yield || 0).toFixed(2) +
                    ' <i>t/ha</i>';
            }

            if (avgRain) {
                avgRain.innerHTML =
                    Number(data.avg_rainfall || 0).toFixed(1) +
                    ' <i>mm</i>';
            }

            if (highRisk) {
                highRisk.textContent = data.high_risk || 0;
            }

            if (!data.total) {
                console.log("CY Analytics: no prediction records.");
                return;
            }

            if (typeof Chart === "undefined") {
                console.error("Chart.js is not available.");
                return;
            }

            /*
             * Destroy existing charts before recreating them.
             * This prevents duplicate-chart errors if analytics
             * is loaded more than once.
             */

            if (yieldChart) {
                yieldChart.destroy();
            }

            if (cropChart) {
                cropChart.destroy();
            }

            if (environmentChart) {
                environmentChart.destroy();
            }

            const yieldCanvas =
                document.getElementById("analyticsYield");

            if (yieldCanvas) {
                yieldChart = new Chart(yieldCanvas, {
                    type: "line",

                    data: {
                        labels: data.labels || [],

                        datasets: [
                            {
                                label: "Yield (t/ha)",
                                data: data.yields || [],
                                tension: 0.35
                            }
                        ]
                    },

                    options: {
                        ...common,

                        plugins: {
                            legend: {
                                display: false
                            }
                        }
                    }
                });

                console.log("Yield chart created.");
            }

            const cropCanvas =
                document.getElementById("analyticsCrop");

            if (cropCanvas) {
                const cropCounts =
                    data.crop_counts || {};

                cropChart = new Chart(cropCanvas, {
                    type: "doughnut",

                    data: {
                        labels: Object.keys(cropCounts),

                        datasets: [
                            {
                                data: Object.values(cropCounts)
                            }
                        ]
                    },

                    options: {
                        responsive: true,
                        maintainAspectRatio: false,

                        plugins: {
                            legend: {
                                display: true
                            }
                        }
                    }
                });

                console.log("Crop chart created.");
            }

            const environmentCanvas =
                document.getElementById("environmentChart");

            if (environmentCanvas) {
                environmentChart = new Chart(
                    environmentCanvas,
                    {
                        type: "line",

                        data: {
                            labels: data.labels || [],

                            datasets: [
                                {
                                    label: "Rainfall (mm)",
                                    data: data.rainfall || [],
                                    tension: 0.35
                                },
                                {
                                    label: "Temperature (°C)",
                                    data: data.temperature || [],
                                    tension: 0.35
                                }
                            ]
                        },

                        options: {
                            ...common,

                            plugins: {
                                legend: {
                                    display: true
                                }
                            }
                        }
                    }
                );

                console.log(
                    "Environment chart created."
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

document.addEventListener(
    "DOMContentLoaded",
    function() {
        console.log("CY App loaded.");

        console.log(
            "Chart.js:",
            typeof Chart
        );

        console.log(
            "Analytics enabled:",
            window.CY_ANALYTICS
        );

        if (window.CY_ANALYTICS) {
            loadAnalytics();
        }
    }
);
