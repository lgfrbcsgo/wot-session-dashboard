const plugin = require('tailwindcss/plugin');

const VERY_BAD = rgb(0, 0, 0);
const BAD = rgb(205, 51, 51);
const BELOW_AVERAGE = rgb(215, 121, 0);
const AVERAGE = rgb(215, 182, 0);
const GOOD = rgb(109, 149, 33);
const VERY_GOOD = rgb(76, 118, 46);
const GREAT = rgb(74, 146, 183);
const UNICUM = rgb(131, 87, 157);
const SUPER_UNICUM = rgb(90, 49, 117);

module.exports = {
    theme: {
        extend: {
            colors: {
                'r-very-bad': mkColorPair(VERY_BAD),
                'r-bad': mkColorPair(BAD),
                'r-below-average': mkColorPair(BELOW_AVERAGE),
                'r-average': mkColorPair(AVERAGE),
                'r-good': mkColorPair(GOOD),
                'r-very-good': mkColorPair(VERY_GOOD),
                'r-great': mkColorPair(GREAT),
                'r-unicum': mkColorPair(UNICUM),
                'r-super-unicum': mkColorPair(SUPER_UNICUM),
            }
        },
        fontFamily: {
            'sans': ['Helvetica', 'Arial', 'sans-serif'],
        },
    },
    variants: {},
    plugins: [
        pluginExt(({addUtilities, mkCls, mapTheme, variants}) => {
            function mkUtility(modifier, value) {
                const className = `grid-rows-h-${modifier}`;
                return {
                    [mkCls(className)]: {
                        'grid-auto-rows': value,
                    },
                };
            }

            const utilities = mapTheme('height', mkUtility)
            addUtilities(utilities, variants('gridTemplateRows'));
        }),
        pluginExt(({addUtilities, mkCls, mapTheme, variants}) => {
            function mkUtility(modifier, value) {
                const className = `grid-cols-fill-w-${modifier}`;
                return {
                    [mkCls(className)]: {
                        'grid-template-columns': `repeat(auto-fill, minmax(${value}, 1fr))`,
                    },
                };
            }

            const utilities = mapTheme('width', mkUtility)
            addUtilities(utilities, variants('gridTemplateColumns'));
        }),
    ],
}

function pluginExt(fn) {
    return plugin(({e, theme, ...rest}) => {
        const mkCls = cls => `.${e(cls)}`;

        const mapTheme = (themeName, mapFn) => {
            const pairs = Object.entries(theme(themeName));
            const utilities = pairs.map(([modifier, value]) => mapFn(modifier, value));
            return Object.assign(...utilities);
        };

        return fn({e, theme, ...rest, mkCls, mapTheme});
    });
}

function rgb(red, green, blue) {
    return {red: red, green: green, blue: blue};
}

function renderColor(rgb) {
    return `rgb(${rgb.red}, ${rgb.green}, ${rgb.blue})`;
}

function contrastColor(color) {
    const brightness = (color.red * 299 + color.green * 587 + color.blue * 114) / 1000;
    return brightness < 125 ? rgb(255, 255, 255) : rgb(0, 0, 0);
}

function mkColorPair(color) {
    return {
        default: renderColor(color),
        fg: renderColor(contrastColor(color)),
    };
}