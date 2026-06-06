console.log("compress.js loaded");

export async function compress(text){
    const compressedStream=
        new Blob([text])
            .stream()
            .pipeThrough(
                new CompressionStream("gzip")
            );

    const buffer=
        await new Response(compressedStream)
            .arrayBuffer();

    const bytes=
        new Uint8Array(buffer);

    const encoded=
        base85.encode(bytes);

    return encodeURIComponent(encoded);
}

export async function decompress(encoded){
    const compressed=
        base85.decode(
            decodeURIComponent(encoded)
        );

    const compressedBytes=
        compressed instanceof Uint8Array
            ? compressed
            : new Uint8Array(compressed);

    const decompressedStream=
        new Blob([compressedBytes])
            .stream()
            .pipeThrough(
                new DecompressionStream("gzip")
            );

    return await new Response(
        decompressedStream
    ).text();
}