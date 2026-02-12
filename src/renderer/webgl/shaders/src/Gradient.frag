// GRADIENT
#pragma phaserTemplate(shaderName)

#extension GL_OES_standard_derivatives : enable

precision highp float;

#pragma phaserTemplate(fragmentHeader)

#define PI 3.14159265358979323846

uniform sampler2D uRampTexture;
uniform vec2 uRampResolution;
uniform float uRampBandStart;
uniform int uRepeatMode;
uniform float uOffset;
uniform int uShapeMode;
uniform vec2 uShape;
uniform vec2 uStart;
uniform bool uDither;

varying vec2 outTexCoord;

float linear()
{
    float len = length(uShape);
    return dot(uShape, outTexCoord - uStart) / len / len;
}

float bilinear()
{
    return abs(linear());
}

float radial()
{
    return distance(uStart, outTexCoord) / length(uShape);
}

float conicSymmetric()
{
    return dot(normalize(uShape), normalize(outTexCoord - uStart)) * 0.5 + 0.5;
}

float conicAsymmetric()
{
    vec2 fromStart = outTexCoord - uStart;
    float angleFromStart = atan(fromStart.y, fromStart.x);
    float shapeAngle = atan(uShape.y, uShape.x);
    float angle = (angleFromStart - shapeAngle) / PI / 2.0;
    if (angle < 0.0) angle += 1.0;
    return angle;
}

float repeat(float value)
{
    if (uRepeatMode == 1)
    {
        // TRUNCATE: don't fill outside 0-1.
        if (value < 0.0 || value > 1.0)
        {
            discard;
        }
        return value;
    }
    else if (uRepeatMode == 2)
    {
        // SAWTOOTH: repeat modulo 1.
        return mod(value, 1.0);
    }
    else if (uRepeatMode == 3)
    {
        // TRIANGULAR: repeat back and forth, modulo 1.
        return 1.0 - abs(1.0 - mod(value, 2.0));
    }
    // EXTEND: clamp to 0 at bottom and 1 at top.
    return clamp(value, 0.0, 1.0);
}

float decodeNumberSample(vec4 sample)
{
    return (
        sample.r * 255.0 +
        sample.g * 255.0 * 256.0 +
        sample.b * 255.0 * 256.0 * 256.0 +
        sample.a * 255.0 * 256.0 * 256.0 * 256.0
    ) / 256.0 / 256.0;
}

struct Band
{
    vec4 colorStart;
    vec4 colorEnd;
    float start;
    float end;
    int colorSpace;
    int interpolation;
    float middle;
};

Band getBand(float progress)
{
    vec2 rampStep = 1.0 / uRampResolution;
    vec2 c = rampStep / 2.0;
    float start = decodeNumberSample(texture2D(uRampTexture, c));
    float end = decodeNumberSample(texture2D(uRampTexture, vec2(1.0, 0.0) * rampStep + c));

    // Expect BAND_TREE_DEPTH to be defined.

    float TREE_OFFSET = 2.0; // Beginning of tree block.
    float index = 0.0;
    float x, y;
    for (float i = 0.0; i < BAND_TREE_DEPTH; i++)
    {
        // Wrap texture coordinate inside multi-row textures.
        x = mod(index, uRampResolution.x) + TREE_OFFSET;
        y = floor(x / uRampResolution.x);

        float pivot = decodeNumberSample(texture2D(uRampTexture, vec2(x, y) * rampStep + c));

        // Move to next tree level and narrow the band.
        // Pivot rounds down, so we don't access undefined branches.
        if (progress > pivot)
        {
            // We're in the upper half.
            start = pivot;
            index = index * 2.0 + 2.0;
        }
        else
        {
            // We're in the lower half.
            end = pivot;
            index = index * 2.0 + 1.0;
        }
    }

    // Get band number.
    float bandNumber = index - uRampBandStart + TREE_OFFSET;
    float bandIndex = bandNumber * 3.0 + uRampBandStart;

    // Get start color.
    x =  mod(bandIndex, uRampResolution.x);
    y = floor(x / uRampResolution.x);
    vec4 colorStart = texture2D(uRampTexture, vec2(x, y) * rampStep + c);

    // Get end color.
    x =  mod(bandIndex + 1.0, uRampResolution.x);
    y = floor(x / uRampResolution.x);
    vec4 colorEnd = texture2D(uRampTexture, vec2(x, y) * rampStep + c);

    // Get additional data.
    x =  mod(bandIndex + 2.0, uRampResolution.x);
    y = floor(x / uRampResolution.x);
    float bandData = decodeNumberSample(texture2D(uRampTexture, vec2(x, y) * rampStep + c));
    int colorSpace = int(floor(bandData / 255.0));
    int interpolation = int(floor(bandData)) - colorSpace * 255;

    return Band(colorStart, colorEnd, start, end, colorSpace, interpolation, fract(bandData) * 2.0);
}

float interpolate(float progress, int mode)
{
    if (mode == 1)
    {
        // CURVED: sharp ends, smooth middle.
        if ((progress *= 2.0) < 1.0)
        {
            return 0.5 * sqrt(1.0 - (--progress * progress));
        }
        progress = 1.0 - progress;
        return 1.0 - 0.5 * sqrt(1.0 - progress * progress);
    }
    if (mode == 2)
    {
        // SINUSOIDAL or circular: smooth ends, sharp middle.
        if ((progress *= 2.0) < 1.0)
        {
            return -0.5 * (sqrt(1.0 - progress * progress) - 1.0);
        }
        return 0.5 * (sqrt(1.0 - (progress -= 2.0) * progress) + 1.0);
    }
    if (mode == 3)
    {
        // CURVE_START
        return sqrt(1.0 - (--progress * progress));
    }
    if (mode == 4)
    {
        // CURVE_END
        return 1.0 - sqrt(1.0 - progress * progress);
    }

    // LINEAR
    return progress;
}

// Interleaved Gradient Noise implementation
float dither(float value)
{
    float dx = dFdx(value);
    float dy = dFdy(value);
    float rateOfChange = sqrt(dx * dx + dy * dy) / sqrt(2.0);
    value += (mod(52.9829189 * mod(0.06711056 * gl_FragCoord.x + 0.00583715 * gl_FragCoord.y, 1.0), 1.0) - 0.5) * rateOfChange;
    return value;
}

vec4 rgbaToHsva(vec4 rgba)
{
    float r = rgba.r;
    float g = rgba.g;
    float b = rgba.b;
    float a = rgba.a;
    float min = min(min(r, g), b);
    float max = max(max(r, g), b);
    float d = max - min;
    float h = 0.0;
    float s = (max == 0.0) ? 0.0 : d / max;
    float v = max;
    if (max != min)
    {
        if (max == r)
        {
            h = (g - b) / d + ((g < b) ? 6.0 : 0.0);
        }
        else if (max == g)
        {
            h = (b - r) / d + 2.0;
        }
        else
        {
            h = (r - g) / d + 4.0;
        }
        h /= 6.0;
    }
    return vec4(h, s, v, a);
}

float hsvaToRgbaConvert(float n, vec4 hsva)
{
    float k = mod(n + hsva.x * 6.0, 6.0);
    float min = min(min(k, 4.0 - k), 1.0);
    return hsva.z - hsva.z * hsva.y * max(0.0, min);
}

vec4 hsvaToRgba(vec4 hsva)
{
    return vec4(
        hsvaToRgbaConvert(5.0, hsva),
        hsvaToRgbaConvert(3.0, hsva),
        hsvaToRgbaConvert(1.0, hsva),
        hsva.a
    );
}

vec4 mixBandColor(float progress, Band band)
{
    if (band.colorSpace == 0)
    {
        // RGBA
        return mix(band.colorStart, band.colorEnd, progress);
    }

    // HSVA
    vec4 hsvaStart = rgbaToHsva(band.colorStart);
    vec4 hsvaEnd = rgbaToHsva(band.colorEnd);

    if (band.colorSpace == 1)
    {
        // HSVA_NEAREST
        float dH = hsvaStart.x - hsvaEnd.x;
        if (dH > 0.5)
        {
            hsvaStart.x -= 1.0;
        }
        else if (dH < -0.5)
        {
            hsvaStart.x += 1.0;
        }
    }
    else if (band.colorSpace == 2)
    {
        // HSVA_PLUS
        if (hsvaStart.x > hsvaEnd.x)
        {
            hsvaStart.x -= 1.0;
        }
    }
    else if (band.colorSpace == 3)
    {
        // HSVA_MINUS
        if (hsvaStart.x < hsvaEnd.x)
        {
            hsvaStart.x += 1.0;
        }
    }

    vec4 hsvaMix = mix(hsvaStart, hsvaEnd, progress);
    hsvaMix.x = mod(hsvaMix.x, 1.0);

    return hsvaToRgba(hsvaMix);
}

void main()
{
    float progress = 0.0;
    if (uShapeMode == 0)
    {
        progress = linear();
    }
    else if (uShapeMode == 1)
    {
        progress = bilinear();
    }
    else if (uShapeMode == 2)
    {
        progress = radial();
    }
    else if (uShapeMode == 3)
    {
        progress = conicSymmetric();
    }
    else if (uShapeMode == 4)
    {
        progress = conicAsymmetric();
    }

    progress -= uOffset;
    progress = repeat(progress);

    Band band = getBand(progress);

    float bandProgress = (progress - band.start) / (band.end - band.start);

    // Apply gamma curve.
    float gamma = log(0.5) / log(band.middle);
    bandProgress = pow(bandProgress, gamma);

    // Apply band interpolation mode.
    bandProgress = interpolate(bandProgress, band.interpolation);

    if (uDither)
    {
        bandProgress = dither(bandProgress);
    }

    vec4 bandCol = mixBandColor(bandProgress, band);

    // Premultiply.
    bandCol.rgb *= bandCol.a;

    gl_FragColor = bandCol;
}
