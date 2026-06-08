console.log("compress.js loaded");

export function compress(text){
    const compressed=pako.gzip(text);
    return encodeURIComponent(base85.encode(compressed));
}
export function decompress(encoded){
    const compressed=
        base85.decode(
            decodeURIComponent(encoded)
        );

    return pako.ungzip(
        compressed,
        {to:"string"}
    );
}