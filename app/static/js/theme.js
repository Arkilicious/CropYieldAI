/*
=========================================================
 CROPYIELD AI — GLOBAL THEME CONTROLLER
=========================================================

One theme state for the entire application.

Storage key:
    cropyield-theme

Supported values:
    light
    dark

Every page in CropYield AI should load this file.
=========================================================
*/

(function () {
    "use strict";

    const STORAGE_KEY = "cropyield-theme";
    const DEFAULT_THEME = "dark";

    /*
    ---------------------------------------------------------
    Get saved theme
    ---------------------------------------------------------
    */
    function getSavedTheme() {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (saved === "light" || saved === "dark") {
            return saved;
        }

        return DEFAULT_THEME;
    }

    /*
    ---------------------------------------------------------
    Apply theme to document
    ---------------------------------------------------------
    */
    function applyTheme(theme) {
        const validTheme =
            theme === "light" || theme === "dark"
                ? theme
                : DEFAULT_THEME;

        const root = document.documentElement;

        root.setAttribute("data-theme", validTheme);
        root.classList.remove("theme-light", "theme-dark");
        root.classList.add(`theme-${validTheme}`);

        root.style.colorScheme = validTheme;

        localStorage.setItem(STORAGE_KEY, validTheme);

        updateThemeControls(validTheme);
        updateThemeMeta(validTheme);

        /*
        Notify any page-specific JavaScript.
        */
        window.dispatchEvent(
            new CustomEvent("cropyield-theme-change", {
                detail: {
                    theme: validTheme
                }
            })
        );

        /*
        Update Chart.js if it exists.
        */
        updateCharts(validTheme);
    }

    /*
    ---------------------------------------------------------
    Toggle theme
    ---------------------------------------------------------
    */
    function toggleTheme() {
        const current = getSavedTheme();

        const next =
            current === "dark"
                ? "light"
                : "dark";

        applyTheme(next);
    }

    /*
    ---------------------------------------------------------
    Update theme buttons/icons
    ---------------------------------------------------------
    */
    function updateThemeControls(theme) {
        const buttons = document.querySelectorAll(
            "[data-theme-toggle], #themeToggle, #landingThemeToggle"
        );

        buttons.forEach((button) => {
            button.setAttribute(
                "aria-label",
                theme === "dark"
                    ? "Switch to light mode"
                    : "Switch to dark mode"
            );

            button.setAttribute(
                "title",
                theme === "dark"
                    ? "Switch to light mode"
                    : "Switch to dark mode"
            );

            const icon =
                button.querySelector(
                    "[data-theme-icon], .theme-icon, #themeIcon, #landingThemeIcon"
                );

            if (icon) {
                icon.textContent =
                    theme === "dark"
                        ? "☀"
                        : "☾";
            }
        });

        /*
        Support standalone icon elements.
        */
        const icons = document.querySelectorAll(
            "#themeIcon, #landingThemeIcon"
        );

        icons.forEach((icon) => {
            icon.textContent =
                theme === "dark"
                    ? "☀"
                    : "☾";
        });
    }

    /*
    ---------------------------------------------------------
    Update browser theme-color
    ---------------------------------------------------------
    */
    function updateThemeMeta(theme) {
        let meta = document.querySelector(
            'meta[name="theme-color"]'
        );

        if (!meta) {
            meta = document.createElement("meta");
            meta.name = "theme-color";
            document.head.appendChild(meta);
        }

        meta.content =
            theme === "dark"
                ? "#07110b"
                : "#f4f7ee";
    }

    /*
    ---------------------------------------------------------
    Update Chart.js charts
    ---------------------------------------------------------
    */
    function updateCharts(theme) {
        if (
            typeof window.Chart === "undefined" ||
            !window.Chart.instances
        ) {
            return;
        }

        const styles = getComputedStyle(
            document.documentElement
        );

        const textColor =
            styles.getPropertyValue("--cy-chart-text").trim() ||
            (theme === "dark" ? "#cbd8ce" : "#405348");

        const gridColor =
            styles.getPropertyValue("--cy-chart-grid").trim() ||
            (theme === "dark"
                ? "rgba(255,255,255,.08)"
                : "rgba(20,51,36,.10)");

        Object.values(window.Chart.instances).forEach(
            (chart) => {
                if (!chart || !chart.options) {
                    return;
                }

                if (chart.options.plugins) {
                    if (chart.options.plugins.legend) {
                        chart.options.plugins.legend.labels =
                            chart.options.plugins.legend.labels || {};

                        chart.options.plugins.legend.labels.color =
                            textColor;
                    }

                    if (chart.options.plugins.title) {
                        chart.options.plugins.title.color =
                            textColor;
                    }
                }

                if (chart.options.scales) {
                    Object.values(chart.options.scales).forEach(
                        (scale) => {
                            if (!scale) return;

                            scale.ticks =
                                scale.ticks || {};

                            scale.ticks.color =
                                textColor;

                            scale.grid =
                                scale.grid || {};

                            scale.grid.color =
                                gridColor;
                        }
                    );
                }

                chart.update("none");
            }
        );
    }

    /*
    ---------------------------------------------------------
    Create a global theme stylesheet
    ---------------------------------------------------------
    This makes the theme work even on standalone pages
    such as login.html and register.html.
    ---------------------------------------------------------
    */
    function createGlobalThemeStyles() {
        if (
            document.getElementById(
                "cropyield-global-theme-styles"
            )
        ) {
            return;
        }

        const style = document.createElement("style");

        style.id =
            "cropyield-global-theme-styles";

        style.textContent = `
            :root {
                --cy-page: #07110b;
                --cy-page-2: #0a1810;
                --cy-page-3: #0e2115;

                --cy-panel: #102719;
                --cy-panel-2: #15331f;
                --cy-panel-3: #1a3d25;

                --cy-card: rgba(18,43,26,.88);

                --cy-text: #dce8df;
                --cy-heading: #ffffff;

                --cy-muted: #9aac9e;
                --cy-muted-2: #728579;

                --cy-line: rgba(255,255,255,.09);
                --cy-line-strong: rgba(255,255,255,.15);

                --cy-accent: #9bd84d;
                --cy-accent-2: #b7eb70;
                --cy-accent-dark: #4d8f2d;

                --cy-danger: #ff6b6b;
                --cy-warning: #f5c451;
                --cy-success: #68d391;
                --cy-info: #65b8ff;

                --cy-input: #0b1b10;

                --cy-sidebar: #07140c;
                --cy-topbar: rgba(7,17,11,.84);

                --cy-shadow:
                    0 20px 60px rgba(0,0,0,.28);

                --cy-glow:
                    0 0 35px rgba(155,216,77,.14);

                --cy-chart-text: #cbd8ce;
                --cy-chart-grid: rgba(255,255,255,.08);

                --cy-radius-sm: 8px;
                --cy-radius-md: 14px;
                --cy-radius-lg: 20px;
                --cy-radius-xl: 28px;
            }

            html[data-theme="light"] {
                --cy-page: #f4f7ee;
                --cy-page-2: #edf3e7;
                --cy-page-3: #e3eddb;

                --cy-panel: #ffffff;
                --cy-panel-2: #f5f8f1;
                --cy-panel-3: #e8f0e2;

                --cy-card: rgba(255,255,255,.94);

                --cy-text: #30443a;
                --cy-heading: #143324;

                --cy-muted: #66786d;
                --cy-muted-2: #87968d;

                --cy-line: rgba(20,51,36,.10);
                --cy-line-strong: rgba(20,51,36,.16);

                --cy-accent: #4d8f2d;
                --cy-accent-2: #6da83b;
                --cy-accent-dark: #245c35;

                --cy-danger: #d94848;
                --cy-warning: #b58105;
                --cy-success: #2f8f58;
                --cy-info: #287eb8;

                --cy-input: #ffffff;

                --cy-sidebar: #e8f0e2;
                --cy-topbar: rgba(244,247,238,.88);

                --cy-shadow:
                    0 18px 50px rgba(36,66,42,.12);

                --cy-glow:
                    0 0 30px rgba(77,143,45,.10);

                --cy-chart-text: #405348;
                --cy-chart-grid: rgba(20,51,36,.10);
            }

            html,
            body {
                background:
                    var(--cy-page);

                color:
                    var(--cy-text);

                transition:
                    background-color .25s ease,
                    color .25s ease;
            }

            body {
                color-scheme: inherit;
            }

            body,
            main,
            section,
            article,
            aside,
            header,
            footer,
            nav,
            .page,
            .content,
            .main-content,
            .dashboard,
            .container {
                transition:
                    background-color .25s ease,
                    color .25s ease,
                    border-color .25s ease,
                    box-shadow .25s ease;
            }

            /*
            Cards / panels
            */
            .card,
            .panel,
            .glass-card,
            .stat-card,
            .dashboard-card,
            .form-card,
            .auth-card,
            .login-card,
            .register-card,
            .chart-card,
            .table-card,
            .content-card,
            .modal-content {
                color: var(--cy-text);
            }

            /*
            Headings
            */
            h1,
            h2,
            h3,
            h4,
            h5,
            h6 {
                color: var(--cy-heading);
            }

            /*
            Muted text
            */
            .muted,
            .text-muted,
            .subtitle,
            .description,
            small {
                color: var(--cy-muted);
            }

            /*
            Inputs
            */
            input,
            select,
            textarea {
                color: var(--cy-text);
                background: var(--cy-input);
                border-color: var(--cy-line-strong);
            }

            input::placeholder,
            textarea::placeholder {
                color: var(--cy-muted-2);
            }

            /*
            Tables
            */
            table {
                color: var(--cy-text);
            }

            th {
                color: var(--cy-heading);
            }

            td,
            th {
                border-color: var(--cy-line);
            }

            /*
            Theme button
            */
            [data-theme-toggle],
            #themeToggle,
            #landingThemeToggle {
                cursor: pointer;
            }

            /*
            Smooth links
            */
            a {
                transition:
                    color .2s ease,
                    background-color .2s ease,
                    border-color .2s ease;
            }

            /*
            Scrollbar
            */
            ::-webkit-scrollbar {
                width: 10px;
                height: 10px;
            }

            ::-webkit-scrollbar-track {
                background: var(--cy-page-2);
            }

            ::-webkit-scrollbar-thumb {
                background: var(--cy-panel-3);
                border-radius: 999px;
                border: 2px solid var(--cy-page-2);
            }

            ::-webkit-scrollbar-thumb:hover {
                background: var(--cy-accent-dark);
            }

            /*
            Selection
            */
            ::selection {
                background: var(--cy-accent);
                color: #10200f;
            }
        `;

        document.head.appendChild(style);
    }

    /*
    ---------------------------------------------------------
    Initialize immediately
    ---------------------------------------------------------
    */
    const savedTheme = getSavedTheme();

    /*
    Apply as early as possible.
    */
    document.documentElement.setAttribute(
        "data-theme",
        savedTheme
    );

    document.documentElement.classList.add(
        `theme-${savedTheme}`
    );

    document.documentElement.style.colorScheme =
        savedTheme;

    /*
    ---------------------------------------------------------
    DOM ready
    ---------------------------------------------------------
    */
    function initialize() {
        createGlobalThemeStyles();

        applyTheme(savedTheme);

        /*
        All supported theme buttons.
        */
        const buttons = document.querySelectorAll(
            "[data-theme-toggle], #themeToggle, #landingThemeToggle"
        );

        buttons.forEach((button) => {
            button.addEventListener(
                "click",
                function (event) {
                    event.preventDefault();
                    toggleTheme();
                }
            );
        });

        updateThemeControls(savedTheme);
        updateThemeMeta(savedTheme);
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initialize
        );
    } else {
        initialize();
    }

    /*
    ---------------------------------------------------------
    Listen for changes from another browser tab/window.
    ---------------------------------------------------------
    */
    window.addEventListener(
        "storage",
        function (event) {
            if (
                event.key === STORAGE_KEY &&
                event.newValue
            ) {
                applyTheme(event.newValue);
            }
        }
    );

    /*
    ---------------------------------------------------------
    Public API
    ---------------------------------------------------------
    */
    window.CropYieldTheme = {
        get: getSavedTheme,

        set: function (theme) {
            applyTheme(theme);
        },

        toggle: function () {
            toggleTheme();
        }
    };
})();