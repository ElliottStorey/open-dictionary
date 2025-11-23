import fs from "fs/promises";
import http from "http";
import { Transform } from "stream";
import { pipeline } from "stream/promises";

const MIME_TYPES = {
    default: "application/octet-stream",
    html: "text/html; charset=UTF-8",
    js: "application/javascript",
    css: "text/css",
    png: "image/png",
    jpg: "image/jpg",
    gif: "image/gif",
    ico: "image/x-icon",
    svg: "image/svg+xml",
};

class Stringify extends Transform {
    constructor() {
        super({ writableObjectMode: true });
    }

    _transform(chunk, encoding, callback) {
        try {
            callback(null, JSON.stringify(chunk));
        } catch (error) {
            callback(error);
        }
    }
}

async function getPath(url) {
    let path = "./routes";
    const params = {};

    const subdirs = url.split("/").filter(Boolean);
    for (const subdir of subdirs) {
        const dirs = await fs.readdir(path);
        if (dirs.includes(subdir)) {
            path += `/${subdir}`;
        } else {
            const dynamicDir = dirs.find(dir => /^\{.*\}$/.test(dir));
            if (!dynamicDir) return { path: null, params };
            params[dynamicDir.slice(1, -1)] = subdir;
            path += `/${dynamicDir}`;
        }
    }

    return { path, params };
}

function getBody(request) {
    return new Promise((resolve, reject) => {
        let body = "";
        request.on("data", chunk => body += chunk.toString());
        request.on("end", () => resolve(body));
        request.on("error", error => reject(error));
    });
}

let base;

const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, base);
    const { path, params } = await getPath(url.pathname);
    const body = await getBody(request);

    if (!path) return response.writeHead(404).end("Not Found");

    if ((await fs.stat(path)).isFile()) {
        const mimeType = MIME_TYPES[path.split(".").at(-1).toLowerCase()] || MIME_TYPES.default;
        response.writeHead(200, { "Content-Type": mimeType });
        return (await fs.open(path)).createReadStream().pipe(response);
    }

    const files = (await fs.readdir(path, { withFileTypes: true })).filter(dir => dir.isFile()).map(dir => dir.name);
    if (files.includes(`${request.method}.js`)) {
        let handlerResponse;
        try {
            const { default: handler } = await import(`${path}/${request.method}.js`);
            handlerResponse = await handler({ url, params, body });
        } catch (error) {
            console.error(error);
            return response.writeHead(500).end("Internal Server Error");
        }
        try {
            if ((handlerResponse[Symbol.iterator] || handlerResponse[Symbol.asyncIterator]) && typeof handlerResponse != "string" && !Array.isArray(handlerResponse)) {
                response.writeHead(200, { "Content-Type": "application/json" });
                await pipeline(handlerResponse, response);
            } else {
                response.writeHead(200, { "Content-Type": "application/json" });
                response.write(JSON.stringify(handlerResponse));
            }
        } catch (e) { console.error(e) }
    } else if (request.method == "GET" && files.includes("index.html")) {
        const handle = await fs.open(`${path}/index.html`);
        const stream = handle.createReadStream();
        response.write("<!doctype html>");
        response.write("<html>");
        response.write("<body>");
        response.write("<script>");
        response.write(`const $request = {url:new URL(${JSON.stringify(url)}),params:${JSON.stringify(params)},body:${JSON.stringify(body)}};`);
        response.write("</script>");
        await pipeline(stream, response);
        response.write("</body>");
        response.end("</html>");
        await handle.close();
    } else {
        return response.writeHead(404).end("Not Found");
    }
}).listen(80);

const { address, family, port } = server.address();
base = family == "IPv6" ? `http://[${address}]:${port}` : `http://${address}:${port}`;
console.log("listening on", base);