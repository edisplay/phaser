/**
 * @author       Richard Davey <rich@phaser.io>
 * @copyright    2013-2026 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */

var Linear = require('../../math/Linear');
var GetColor = require('./GetColor');
var HSVToRGB = require('./HSVToRGB');

/**
 * @namespace Phaser.Display.Color.Interpolate
 * @memberof Phaser.Display.Color
 * @since 3.0.0
 */

/**
 * Interpolates between the two given color ranges over the length supplied.
 *
 * @function Phaser.Display.Color.Interpolate.RGBWithRGB
 * @memberof Phaser.Display.Color.Interpolate
 * @static
 * @since 3.0.0
 *
 * @param {number} r1 - Red value.
 * @param {number} g1 - Blue value.
 * @param {number} b1 - Green value.
 * @param {number} r2 - Red value.
 * @param {number} g2 - Blue value.
 * @param {number} b2 - Green value.
 * @param {number} [length=100] - Distance to interpolate over.
 * @param {number} [index=0] - Index to start from.
 *
 * @return {Phaser.Types.Display.ColorObject} An object containing the interpolated color values.
 */
var RGBWithRGB = function (r1, g1, b1, r2, g2, b2, length, index)
{
    if (length === undefined) { length = 100; }
    if (index === undefined) { index = 0; }

    var t = index / length;
    var r = Linear(r1, r2, t);
    var g = Linear(g1, g2, t);
    var b = Linear(b1, b2, t);

    return {
        r: r,
        g: g,
        b: b,
        a: 255,
        color: GetColor(r, g, b)
    };
};

var HSVWithHSV = function (h1, s1, v1, h2, s2, v2, length, index, sign)
{
    if (sign === undefined) { sign = 0; }
    if (sign === 0)
    {
        // Nearest hue.
        var dH = h1 - h2;
        if (dH > 0.5) { h1 -= 1; }
        else if (dH < -0.5) { h1 += 1; }
    }
    else if (sign > 0)
    {
        // Strictly increase hue.
        if (h1 > h2) { h1 -= 1; }
    }
    else if (h1 < h2) { h1 += 1; } // Strictly decrease hue.

    var t = index / length;
    var h = Linear(h1, h2, t);
    var s = Linear(s1, s2, t);
    var v = Linear(v1, v2, t);
    return HSVToRGB(h, s, v);
};

/**
 * Interpolates between the two given color objects over the length supplied.
 *
 * @function Phaser.Display.Color.Interpolate.ColorWithColor
 * @memberof Phaser.Display.Color.Interpolate
 * @static
 * @since 3.0.0
 *
 * @param {Phaser.Display.Color} color1 - The first Color object.
 * @param {Phaser.Display.Color} color2 - The second Color object.
 * @param {number} [length=100] - Distance to interpolate over.
 * @param {number} [index=0] - Index to start from.
 * @param {boolean} [hsv=false] - Whether to interpolate in HSV.
 * @param {number} [hsvSign=0] - Preferred direction for HSV interpolation. 0 is nearest, negative always decreases hue, positive always increases hue.
 *
 * @return {Phaser.Types.Display.ColorObject} An object containing the interpolated color values.
 */
var ColorWithColor = function (color1, color2, length, index, hsv, hsvSign)
{
    if (length === undefined) { length = 100; }
    if (index === undefined) { index = 0; }

    if (hsv)
    {
        return HSVWithHSV(color1.h, color1.s, color1.v, color2.h, color2.s, color2.v, length, index, hsvSign);
    }

    return RGBWithRGB(color1.r, color1.g, color1.b, color2.r, color2.g, color2.b, length, index);
};

/**
 * Interpolates between the Color object and color values over the length supplied.
 *
 * @function Phaser.Display.Color.Interpolate.ColorWithRGB
 * @memberof Phaser.Display.Color.Interpolate
 * @static
 * @since 3.0.0
 *
 * @param {Phaser.Display.Color} color1 - The first Color object.
 * @param {number} r - Red value.
 * @param {number} g - Blue value.
 * @param {number} b - Green value.
 * @param {number} [length=100] - Distance to interpolate over.
 * @param {number} [index=0] - Index to start from.
 *
 * @return {Phaser.Types.Display.ColorObject} An object containing the interpolated color values.
 */
var ColorWithRGB = function (color, r, g, b, length, index)
{
    if (length === undefined) { length = 100; }
    if (index === undefined) { index = 0; }

    return RGBWithRGB(color.r, color.g, color.b, r, g, b, length, index);
};

module.exports = {

    RGBWithRGB: RGBWithRGB,
    HSVWithHSV: HSVWithHSV,
    ColorWithRGB: ColorWithRGB,
    ColorWithColor: ColorWithColor

};
