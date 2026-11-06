const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const rootDirectory = __dirname;
const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const contentTypes = {
	".css": "text/css; charset=utf-8",
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".png": "image/png",
	".ttf": "font/ttf",
};

function loadLocalEnvironment() {
	const environmentPath = path.join(rootDirectory, ".env");
	if (!fs.existsSync(environmentPath)) return;

	for (const line of fs.readFileSync(environmentPath, "utf8").split(/\r?\n/)) {
		const match = line.trim().match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
		if (!match || Object.hasOwn(process.env, match[1])) continue;
		let value = match[2].trim();
		if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
			value = value.slice(1, -1);
		}
		process.env[match[1]] = value;
	}
}

loadLocalEnvironment();

function sendJson(response, statusCode, body) {
	response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
	response.end(JSON.stringify(body));
}

async function readJsonBody(request) {
	const chunks = [];
	let size = 0;
	for await (const chunk of request) {
		size += chunk.length;
		if (size > 16_384) throw new Error("Request body too large.");
		chunks.push(chunk);
	}
	return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function getWebhookUrl() {
	try {
		const webhookUrl = new URL(process.env.DISCORD_WEBHOOK_URL);
		if (
			webhookUrl.protocol !== "https:" ||
			webhookUrl.hostname !== "discord.com" ||
			!/^\/api\/webhooks\/\d+\/[^/]+$/.test(webhookUrl.pathname)
		) {
			return null;
		}
		return webhookUrl;
	} catch {
		return null;
	}
}

async function handleSubmission(request, response) {
	if (request.headers["content-type"]?.split(";")[0] !== "application/json") {
		return sendJson(response, 415, { error: "Expected a JSON request." });
	}

	let body;
	try {
		body = await readJsonBody(request);
	} catch {
		return sendJson(response, 400, { error: "Invalid request body." });
	}

	if (typeof body.message !== "string" || !body.message.trim() || body.message.length > 2000) {
		return sendJson(response, 400, { error: "Message must contain 1 to 2000 characters." });
	}

	const webhookUrl = getWebhookUrl();
	if (!webhookUrl) {
		return sendJson(response, 500, { error: "The Discord webhook is not configured." });
	}
	webhookUrl.searchParams.set("with_components", "true");
	webhookUrl.searchParams.set("wait", "true");

	const discordMessage = {
		flags: 1 << 15,
		allowed_mentions: { parse: [] },
		components: [
			{
				type: 17,
				components: [{ type: 10, content: body.message }],
			},
		],
	};

	try {
		const discordResponse = await fetch(webhookUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(discordMessage),
		});
		if (!discordResponse.ok) {
			const responseBody = await discordResponse.text();
			let discordError = "Discord could not accept the message.";
			try {
				const details = JSON.parse(responseBody);
				if (typeof details.message === "string") discordError = details.message;
				if (details.code) discordError += ` (${details.code})`;
			} catch {
				if (responseBody) discordError = responseBody.slice(0, 300);
			}
			console.error(`Discord webhook returned HTTP ${discordResponse.status}: ${discordError}`);
			return sendJson(response, 502, { error: discordError });
		}
		response.writeHead(204, { "Cache-Control": "no-store" });
		response.end();
	} catch (error) {
		console.error("Discord webhook request failed:", error.message);
		sendJson(response, 502, { error: "Discord could not be reached." });
	}
}

async function serveStaticFile(request, response, pathname) {
	if (request.method !== "GET" && request.method !== "HEAD") {
		return sendJson(response, 405, { error: "Method not allowed." });
	}

	let relativePath;
	try {
		relativePath = decodeURIComponent(pathname === "/" ? "/index.html" : pathname);
	} catch {
		return sendJson(response, 400, { error: "Invalid path." });
	}
	const filePath = path.resolve(rootDirectory, `.${relativePath}`);
	if (
		(!filePath.startsWith(`${rootDirectory}${path.sep}`) && filePath !== path.join(rootDirectory, "index.html")) ||
		path.relative(rootDirectory, filePath).split(path.sep).some((part) => part.startsWith("."))
	) {
		return sendJson(response, 404, { error: "Not found." });
	}

	try {
		const content = await fs.promises.readFile(filePath);
		response.writeHead(200, {
			"Content-Type": contentTypes[path.extname(filePath).toLowerCase()] ?? "application/octet-stream",
			"X-Content-Type-Options": "nosniff",
		});
		response.end(request.method === "HEAD" ? undefined : content);
	} catch {
		sendJson(response, 404, { error: "Not found." });
	}
}

const server = http.createServer(async (request, response) => {
	const requestUrl = new URL(request.url, "http://localhost");
	if (request.method === "POST" && requestUrl.pathname === "/api/strawpage") {
		return handleSubmission(request, response);
	}
	return serveStaticFile(request, response, requestUrl.pathname);
});

server.listen(port, "0.0.0.0", () => {
	console.log(`Mov's Vault is running at http://localhost:${port}`);
});