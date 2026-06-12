#include <cmath>
#include <cstdint>
#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>
static const uint32_t pow2 = 7225;
static const uint32_t pow3 = 614125;
static const uint32_t pow4 = 52200625;
using Uint8Array = std::vector<uint8_t>;
Uint8Array charsetToMap(const std::string& charset) {
    if (charset.size() != 85) throw std::invalid_argument("Charset length must be 85");
    Uint8Array ui8a(85);
    for (size_t i = 0; i < 85; i++) {
        ui8a[i] = static_cast<uint8_t>(charset[i]);
    }
    return ui8a;
}
Uint8Array ascii85 = charsetToMap("!\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstu");
Uint8Array z85 = charsetToMap("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-:+=^!/*?&<>()[]{}@%$#");
const Uint8Array& getMap(const std::string& charset = "z85") {
    if (charset == "ascii85") {
        return ascii85;
    }
    if (charset.size() == 85) {
        static Uint8Array customMap;
        customMap = charsetToMap(charset);
        return customMap;
    }
    return z85;
}
Uint8Array getReverseMap(const Uint8Array& mapOrig) {
    Uint8Array revMap(128, 0);
    for (size_t i = 0; i < mapOrig.size(); i++) {
        uint8_t charCode = mapOrig[i];
        if (charCode < 128) {
            revMap[charCode] = static_cast<uint8_t>(i);
        }
    }
    return revMap;
}
std::string encode(const Uint8Array& ui8a, const std::string& charset = "z85") {
    const Uint8Array& charMap = getMap(charset);
    size_t remain = ui8a.size() % 4;
    size_t last5Length = remain ? remain + 1 : 0;
    size_t length = static_cast<size_t>(std::ceil(ui8a.size() * 5.0 / 4.0));
    Uint8Array target(length);
    size_t to = ui8a.size() / 4;
    for (size_t i = 0; i < to; i++) {
        uint32_t num = 0;
        num |= static_cast<uint32_t>(ui8a[i * 4]) << 24;
        num |= static_cast<uint32_t>(ui8a[i * 4 + 1]) << 16;
        num |= static_cast<uint32_t>(ui8a[i * 4 + 2]) << 8;
        num |= static_cast<uint32_t>(ui8a[i * 4 + 3]);
        for (int k = 4; k >= 0; k--) {
            target[k + i * 5] = charMap[num % 85];
            num /= 85;
        }
    }
    if (remain) {
        size_t lastPartIndex = to * 4;
        Uint8Array lastPart(4, 0);
        for (size_t i = 0; i < remain; i++) {
            lastPart[i] = ui8a[lastPartIndex + i];
        }
        uint32_t num = 0;
        num |= static_cast<uint32_t>(lastPart[0]) << 24;
        num |= static_cast<uint32_t>(lastPart[1]) << 16;
        num |= static_cast<uint32_t>(lastPart[2]) << 8;
        num |= static_cast<uint32_t>(lastPart[3]);
        size_t offset = target.size() - last5Length - 1;
        for (int i = 4; i >= 0; i--) {
            uint8_t value = charMap[num % 85];
            num /= 85;
            if (i < static_cast<int>(last5Length)) {
                size_t index = offset + i + 1;
                target[index] = value;
            }
        }
    }
    return std::string(target.begin(), target.end());
}
Uint8Array decode(const std::string& base85, const std::string& charset = "z85") {
    const Uint8Array& map = getMap(charset);
    Uint8Array revMap = getReverseMap(map);
    Uint8Array base85ab(base85.begin(), base85.end());
    size_t pad = (5 - (base85ab.size() % 5)) % 5;
    size_t outSize = (static_cast<size_t>(std::ceil(base85ab.size() / 5.0)) * 4) - pad;
    Uint8Array ints(outSize);
    size_t i = 0, fullBlocks = (base85ab.size() + 4) / 5;
    for (; i + 1 < fullBlocks; i++) {
        uint32_t c1 = revMap[base85ab[i * 5 + 4]];
        uint32_t c2 = revMap[base85ab[i * 5 + 3]] * 85;
        uint32_t c3 = revMap[base85ab[i * 5 + 2]] * pow2;
        uint32_t c4 = revMap[base85ab[i * 5 + 1]] * pow3;
        uint32_t c5 = revMap[base85ab[i * 5]] * pow4;
        uint32_t val = c1 + c2 + c3 + c4 + c5;
        ints[i * 4] = static_cast<uint8_t>((val >> 24) & 0xFF);
        ints[i * 4 + 1] = static_cast<uint8_t>((val >> 16) & 0xFF);
        ints[i * 4 + 2] = static_cast<uint8_t>((val >> 8) & 0xFF);
        ints[i * 4 + 3] = static_cast<uint8_t>(val & 0xFF);
    }
    uint8_t lCh = map[map.size() - 1];
    Uint8Array lastPart(base85ab.begin() + i * 5, base85ab.end());
    lastPart.insert(lastPart.end(), 4, lCh);
    uint32_t c1 = revMap[lastPart[4]];
    uint32_t c2 = revMap[lastPart[3]] * 85;
    uint32_t c3 = revMap[lastPart[2]] * pow2;
    uint32_t c4 = revMap[lastPart[1]] * pow3;
    uint32_t c5 = revMap[lastPart[0]] * pow4;
    uint32_t val = c1 + c2 + c3 + c4 + c5;
    uint8_t decoded[4]{
        static_cast<uint8_t>((val >> 24) & 0xFF),
        static_cast<uint8_t>((val >> 16) & 0xFF),
        static_cast<uint8_t>((val >> 8) & 0xFF),
        static_cast<uint8_t>(val & 0xFF)
    };
    for (size_t j = 0; j < 4 - pad; j++) {
        ints[i * 4 + j] = decoded[j];
    }
    return ints;
}
/*
int main() {
    std::string inp = "Hello, World!";
    Uint8Array data(inp.begin(), inp.end());
    std::string encoded = encode(data, "ascii85");
    Uint8Array decoded = decode(encoded, "ascii85");
    std::string decodedStr(decoded.begin(), decoded.end());
    std::cout << "Original: " << inp << std::endl;
    std::cout << "Encoded: " << encoded << std::endl;
    std::cout << "Decoded: " << decodedStr << std::endl;
    return 0;
}*/