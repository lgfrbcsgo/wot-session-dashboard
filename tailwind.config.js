function rgb(red, green, blue) {
    return { red: red, green: green, blue: blue };
}

function renderColor(rgb) {
    return `rgb(${rgb.red}, ${rgb.green}, ${rgb.blue})`;
}

function contrastColor(color) {
    const brightness = (color.red * 299 + color.green * 587 + color.blue * 114) / 1000;
    return brightness < 125 ? rgb(255, 255, 255) : rgb(0, 0, 0);
}

function make(color) {
    return {
        default: renderColor(color),
        contrast: renderColor(contrastColor(color)),
    };
}

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
                'r-very-bad': make(VERY_BAD),
                'r-bad': make(BAD),
                'r-below-average': make(BELOW_AVERAGE),
                'r-average': make(AVERAGE),
                'r-good': make(GOOD),
                'r-very-good': make(VERY_GOOD),
                'r-great': make(GREAT),
                'r-unicum': make(UNICUM),
                'r-super-unicum': make(SUPER_UNICUM),
            }
        },
        fontFamily: {
            'sans': ['Helvetica', 'Arial', 'sans-serif'],
        },
    },
    variants: {},
    plugins: [],
}