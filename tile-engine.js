const tilemap = window.tilemapData;
const tileSize = 16;
const canvas = document.getElementById("tilemap");
const maximumTileDisplaySize = 50;
const minimumTilesAcross = 16;
const textBoxes = document.querySelectorAll(".text-box");
const mapButtons = document.querySelectorAll(".tilemap-button");
const strawpageBox = document.getElementById("strawpage-box");
const strawpageButton = document.getElementById("strawpage-button");
const strawpageStatus = document.getElementById("strawpage-status");

let mapWidth;
let mapHeight;
let tileDisplaySize;

async function sendStrawpageMessage() {
	const message = strawpageBox.value;
	if (!message.trim() || strawpageButton.disabled) return;

	strawpageButton.disabled = true;
	strawpageStatus.textContent = "Sending message.";
	try {
		const response = await fetch("/api/strawpage", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ message }),
		});
		if (!response.ok) {
			const result = await response.json().catch(() => ({}));
			throw new Error(result.error || `Message could not be sent (${response.status}).`);
		}

		strawpageBox.value = "";
		strawpageStatus.textContent = "Message sent.";
	} catch (error) {
		console.error("Sending the Strawpage message failed:", error);
		strawpageStatus.textContent = error.message || "Message could not be sent. Please try again.";
	} finally {
		strawpageButton.disabled = false;
	}
}

strawpageButton.addEventListener("click", sendStrawpageMessage);

function updateDisplaySize() {
	tileDisplaySize = Math.min(maximumTileDisplaySize, window.innerWidth / minimumTilesAcross);
	document.documentElement.style.setProperty("--map-width", `${mapWidth * tileDisplaySize}px`);
	document.documentElement.style.setProperty("--tile-display-size", `${tileDisplaySize}px`);

	for (const textBox of textBoxes) {
		textBox.style.left = `${Number.parseFloat(textBox.dataset.gridX) * tileDisplaySize}px`;
		textBox.style.top = `${Number.parseFloat(textBox.dataset.gridY) * tileDisplaySize}px`;
		textBox.style.width = `${Number.parseFloat(textBox.dataset.gridWidth) * tileDisplaySize}px`;
		textBox.style.height = `${Number.parseFloat(textBox.dataset.gridHeight) * tileDisplaySize}px`;
	}

	for (const button of mapButtons) {
		button.style.left = `${Number.parseFloat(button.dataset.gridX) * tileDisplaySize}px`;
		button.style.top = `${Number.parseFloat(button.dataset.gridY) * tileDisplaySize}px`;
		button.style.width = `${Number.parseFloat(button.dataset.gridWidth) * tileDisplaySize}px`;
		button.style.height = `${Number.parseFloat(button.dataset.gridHeight) * tileDisplaySize}px`;
	}
}

for (const eventName of ["contextmenu", "dragstart", "selectstart"]) {
	canvas.addEventListener(eventName, (event) => event.preventDefault());
}

const context = canvas.getContext("2d");
const tileset = new Image();

context.imageSmoothingEnabled = false;

const treeStateMap = new Map();
let audioCtx = null;
const soundBuffers = {};

async function loadSounds() {
	try {
		audioCtx = new (window.AudioContext || window.webkitAudioContext)();
		const soundFiles = {
			chop: "chop.wav",
			finalChop: "final_chop.wav",
			groundHit: "ground_hit.wav",
		};

		for (const [key, url] of Object.entries(soundFiles)) {
			const response = await fetch(url);
			if (!response.ok) {
				console.warn(`Could not load sound file: ${url}`);
				continue;
			}
			const arrayBuffer = await response.arrayBuffer();
			soundBuffers[key] = await audioCtx.decodeAudioData(arrayBuffer);
		}
	} catch (e) {
		console.warn("Audio loading or Web Audio API not supported yet:", e);
	}
}

function playSound(key) {
	if (!audioCtx) return;
	if (audioCtx.state === "suspended") {
		audioCtx.resume();
	}
	const buffer = soundBuffers[key];
	if (!buffer) return;

	try {
		const source = audioCtx.createBufferSource();
		source.buffer = buffer;

				const minRate = 0.8;
		const maxRate = 1.2;
		source.playbackRate.value = minRate + Math.random() * (maxRate - minRate);

		source.connect(audioCtx.destination);
		source.start(0);
	} catch (e) {
		console.warn("Error playing sound buffer:", e);
	}
}

function drawTile(sourceX, sourceY, destinationX, destinationY) {
	context.drawImage(
		tileset,
		sourceX * tileSize,
		sourceY * tileSize,
		tileSize,
		tileSize,
		destinationX * tileSize,
		destinationY * tileSize,
		tileSize,
		tileSize,
	);
}

function parseTileCoordinates(value) {
	const coordinates = value?.split(",").map((coordinate) => Number.parseInt(coordinate.trim(), 10));
	return coordinates?.length === 2 && coordinates.every(Number.isInteger) && coordinates.every((coordinate) => coordinate >= 0) ? coordinates : null;
}

function drawButtonIcon(button, buttonContext, hovered, columns, rows) {
	const hasHoverIcon = button.dataset.hoverIconTile || button.dataset.hoverIconObject;
	const iconTile = hovered && hasHoverIcon ? button.dataset.hoverIconTile : button.dataset.iconTile;
	const iconObjectName = hovered && hasHoverIcon ? button.dataset.hoverIconObject : button.dataset.iconObject;
	let icon;

	if (iconTile) {
		const [x, y] = parseTileCoordinates(iconTile) ?? [];
		if (x === undefined || x >= columns || y >= rows) {
			console.warn(`Invalid ${hovered ? "hover " : ""}icon tile for button: ${iconTile}.`);
			return;
		}
		icon = { x, y, width: 1, height: 1 };
	} else if (iconObjectName) {
		icon = tilemap.objects?.[iconObjectName];
		if (
			!icon ||
			![icon.x, icon.y, icon.width, icon.height].every(Number.isInteger) ||
			icon.x < 0 ||
			icon.y < 0 ||
			icon.width < 1 ||
			icon.height < 1 ||
			icon.x + icon.width > columns ||
			icon.y + icon.height > rows
		) {
			console.warn(`Invalid ${hovered ? "hover " : ""}icon object for button: ${iconObjectName}.`);
			return;
		}
	} else {
		return;
	}

	const iconWidth = icon.width * tileSize;
	const iconHeight = icon.height * tileSize;
	buttonContext.drawImage(
		tileset,
		icon.x * tileSize,
		icon.y * tileSize,
		iconWidth,
		iconHeight,
		(buttonContext.canvas.width - iconWidth) / 2,
		(buttonContext.canvas.height - iconHeight) / 2,
		iconWidth,
		iconHeight,
	);
}

function drawButton(button, hovered, columns, rows) {
	const buttonContext = button.querySelector("canvas").getContext("2d");
	const sliceValue = hovered ? button.dataset.hoverSlice || button.dataset.normalSlice : button.dataset.normalSlice;
	const slice = parseTileCoordinates(sliceValue);
	buttonContext.clearRect(0, 0, buttonContext.canvas.width, buttonContext.canvas.height);

	if (!slice || slice[0] + 3 > columns || slice[1] + 3 > rows) {
		console.warn(`Invalid ${hovered ? "hover " : "normal "}nine-slice for button: ${sliceValue}.`);
		return;
	}

	const width = buttonContext.canvas.width;
	const height = buttonContext.canvas.height;
	const edgeWidth = Math.min(tileSize, width / 2);
	const edgeHeight = Math.min(tileSize, height / 2);
	const destinationWidths = [edgeWidth, width - edgeWidth * 2, edgeWidth];
	const destinationHeights = [edgeHeight, height - edgeHeight * 2, edgeHeight];
	let destinationY = 0;

	for (let row = 0; row < 3; row += 1) {
		let destinationX = 0;
		for (let column = 0; column < 3; column += 1) {
			const destinationWidth = destinationWidths[column];
			const destinationHeight = destinationHeights[row];
			if (destinationWidth > 0 && destinationHeight > 0) {
				buttonContext.drawImage(
					tileset,
					(slice[0] + column) * tileSize,
					(slice[1] + row) * tileSize,
					tileSize,
					tileSize,
					destinationX,
					destinationY,
					destinationWidth,
					destinationHeight,
				);
			}
			destinationX += destinationWidth;
		}
		destinationY += destinationHeights[row];
	}

	drawButtonIcon(button, buttonContext, hovered, columns, rows);
}

function initializeMapButtons(columns, rows) {
	for (const button of mapButtons) {
		const width = Number.parseFloat(button.dataset.gridWidth);
		const height = Number.parseFloat(button.dataset.gridHeight);
		if (!Number.isFinite(width) || !Number.isFinite(height) || width < 2 || height < 2) {
			console.warn("Tilemap buttons need grid width and height values of at least 2.");
			continue;
		}

		const art = document.createElement("canvas");
		art.className = "tilemap-button__art";
		art.setAttribute("aria-hidden", "true");
		art.width = Math.round(width * tileSize);
		art.height = Math.round(height * tileSize);
		button.prepend(art);

		let activePointerId = null;
		const renderState = (pressed) => drawButton(button, pressed, columns, rows);

		button.addEventListener("pointerdown", (event) => {
			if (!event.isPrimary || event.button !== 0) return;
			activePointerId = event.pointerId;
			button.setPointerCapture(event.pointerId);
			renderState(true);
		});

		for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"]) {
			button.addEventListener(eventName, (event) => {
				if (event.pointerId !== activePointerId) return;
				activePointerId = null;
				renderState(false);
			});
		}

		renderState(false);
	}
}

async function renderMap(mapLayers) {
	if (mapLayers.some((layer) => typeof layer !== "string")) {
		throw new Error("Every tilemap layer must be a multiline string.");
	}

		loadSounds();

	const mapLinesByLayer = mapLayers.map((layer) => {
		const lines = layer.split(/\r?\n/);
		if (lines.at(-1) === "") lines.pop();
		return lines;
	});
	mapWidth = Math.max(...mapLinesByLayer.flatMap((lines) => lines.map((line) => line.length)));
	mapHeight = Math.max(...mapLinesByLayer.map((lines) => lines.length));
	if (mapWidth < 1 || mapHeight < 1) {
		throw new Error("Tilemap data must contain at least one row and one column.");
	}

		treeStateMap.clear();
	if (mapLinesByLayer[1]) {
		mapLinesByLayer[1] = mapLinesByLayer[1].map((line, y) => {
			let updatedLine = "";
			for (let x = 0; x < line.length; x += 1) {
				const char = line[x];
				if (char === "t" || char === "T") {
					treeStateMap.set(`${x},${y}`, {
						x,
						y,
						char,
						health: 3,
						shakeOffset: 0,
						fallAngle: 0,
						fallDirection: Math.random() < 0.5 ? -1 : 1,
						opacity: 1,
						isFalling: false,
						isGone: false,
					});
					updatedLine += "s"; 				} else {
					updatedLine += char;
				}
			}
			return updatedLine;
		});
	}

	updateDisplaySize();
	window.addEventListener("resize", updateDisplaySize);
	canvas.width = mapWidth * tileSize;
	canvas.height = mapHeight * tileSize;

	await new Promise((resolve, reject) => {
		tileset.onload = resolve;
		tileset.onerror = reject;
		tileset.src = "tileset.png";
	});

	const columns = Math.floor(tileset.width / tileSize);
	const rows = Math.floor(tileset.height / tileSize);
	initializeMapButtons(columns, rows);

	const animationStart = performance.now();
	const animationDelays = new Set();
	const warnedCharacters = new Set();

	function drawCharacter(character, destinationX, destinationY, transform = null) {
		const definition = tilemap.legend?.[character];
		if (!definition) {
			if (!warnedCharacters.has(character)) {
				console.warn(`No tilemap legend entry for "${character}".`);
				warnedCharacters.add(character);
			}
			return;
		}

		if (definition.tile) {
			const isAnimated = Array.isArray(definition.tile[0]);
			let sourceTile = definition.tile;

			if (isAnimated) {
				const delay = definition.delay;
				if (!Number.isFinite(delay) || delay <= 0 || definition.tile.length === 0) {
					if (!warnedCharacters.has(character)) {
						console.warn(`Invalid animation delay or frames for "${character}".`);
						warnedCharacters.add(character);
					}
					return;
				}

				const validFrames = definition.tile.every(
					(frame) =>
						Array.isArray(frame) &&
						frame.length === 2 &&
						frame.every(Number.isInteger) &&
						frame[0] >= 0 &&
						frame[1] >= 0 &&
						frame[0] < columns &&
						frame[1] < rows,
				);

				if (!validFrames) {
					if (!warnedCharacters.has(character)) {
						console.warn(`Invalid animation frame for "${character}".`);
						warnedCharacters.add(character);
					}
					return;
				}

				const delayMs = delay * 1000;
				animationDelays.add(delayMs);
				const elapsed = performance.now() - animationStart;
				const frameIndex = Math.floor(elapsed / delayMs) % definition.tile.length;
				sourceTile = definition.tile[frameIndex];
			} else if (
				!Array.isArray(sourceTile) ||
				sourceTile.length !== 2 ||
				!sourceTile.every(Number.isInteger) ||
				sourceTile[0] < 0 ||
				sourceTile[1] < 0 ||
				sourceTile[0] >= columns ||
				sourceTile[1] >= rows
			) {
				console.warn(`Invalid tile definition for "${character}".`);
				return;
			}

			drawTile(sourceTile[0], sourceTile[1], destinationX, destinationY);
			return;
		}

		if (!definition.object) return;
		const object = tilemap.objects?.[definition.object];
		if (!object) {
			console.warn(`Unknown object "${definition.object}" for "${character}".`);
			return;
		}

		const { x, y, width, height } = object;
		if (![x, y, width, height].every(Number.isInteger) || x < 0 || y < 0 || width < 1 || height < 1 || x + width > columns || y + height > rows) {
			console.warn(`Invalid object definition "${definition.object}".`);
			return;
		}

		if (transform) {
			context.save();
			context.imageSmoothingEnabled = false;
			context.globalAlpha = transform.opacity ?? 1;
			const pivotX = (destinationX + width / 2) * tileSize + (transform.shakeOffset ?? 0);
			const pivotY = (destinationY + 0.5) * tileSize;
			context.translate(pivotX, pivotY);
			context.rotate(transform.fallAngle ?? 0);
			const inset = 0.5;
			context.drawImage(
				tileset,
				x * tileSize + inset,
				y * tileSize + inset,
				width * tileSize - inset * 2,
				height * tileSize - inset * 2,
				-(width * tileSize) / 2,
				-((height - 0.5) * tileSize),
				width * tileSize,
				height * tileSize,
			);
			context.restore();
		} else {
			context.drawImage(
				tileset,
				x * tileSize,
				y * tileSize,
				width * tileSize,
				height * tileSize,
				destinationX * tileSize,
				(destinationY - height + 1) * tileSize,
				width * tileSize,
				height * tileSize,
			);
		}
	}

	function drawScene() {
		context.clearRect(0, 0, canvas.width, canvas.height);
		for (let row = 0; row < mapHeight; row += 1) {
			for (let column = 0; column < mapWidth; column += 1) {
				drawTile((row + column + 1) % 2, 0, column, row);
			}
		}

		for (let layerIndex = mapLinesByLayer.length - 1; layerIndex >= 0; layerIndex -= 1) {
			const mapLines = mapLinesByLayer[layerIndex];
			for (let destinationY = 0; destinationY < mapLines.length; destinationY += 1) {
				const line = mapLines[destinationY];
				for (let destinationX = 0; destinationX < line.length; destinationX += 1) {
					const character = line[destinationX];
					if (character === ".") continue;
					drawCharacter(character, destinationX, destinationY);
				}
			}

			if (layerIndex === 1) {
				const sortedTrees = [...treeStateMap.values()].filter((tree) => !tree.isGone).sort((a, b) => a.y - b.y);

				for (const tree of sortedTrees) {
					drawCharacter(tree.char, tree.x, tree.y, tree);
				}
			}
		}
	}

	function animateTreeFall(tree) {
		const start = performance.now();
		const duration = 2500;
		let groundHitPlayed = false;

		function step(now) {
			const elapsed = now - start;
			const progress = Math.min(1, elapsed / duration);

						if (elapsed >= duration / 2 && !groundHitPlayed) {
				groundHitPlayed = true;
				playSound("groundHit");

								const stage = document.querySelector(".tilemap-stage");
				if (stage) {
					stage.classList.add("shake");
					setTimeout(() => {
						stage.classList.remove("shake");
					}, 300); 				}
			}

			if (progress < 0.5) {
				tree.fallAngle = tree.fallDirection * (Math.PI / 2) * ((progress / 0.5) * (progress / 0.5));
			} else {
				tree.opacity = 1 - (progress - 0.5) / 0.5;
			}
			drawScene();

			if (progress < 1) {
				requestAnimationFrame(step);
			} else {
				tree.isGone = true;
				drawScene();
			}
		}

		requestAnimationFrame(step);
	}

	canvas.addEventListener("click", (event) => {
		const rect = canvas.getBoundingClientRect();
		const scaleX = canvas.width / rect.width;
		const scaleY = canvas.height / rect.height;
		const canvasX = (event.clientX - rect.left) * scaleX;
		const canvasY = (event.clientY - rect.top) * scaleY;

		const candidates = [...treeStateMap.values()].filter((tree) => !tree.isFalling && !tree.isGone).sort((a, b) => b.y - a.y);

		for (const tree of candidates) {
			const def = tilemap.legend?.[tree.char];
			const obj = def?.object ? tilemap.objects?.[def.object] : null;
			const width = (obj?.width ?? 1) * tileSize;
			const height = ((obj?.height ?? 2) - 1) * tileSize;
			const left = tree.x * tileSize;
			const top = (tree.y - (obj?.height ?? 1) + 2) * tileSize;

			if (canvasX >= left && canvasX <= left + width && canvasY >= top && canvasY <= top + height) {
				tree.health -= 1;

				if (tree.health > 0) {
					playSound("chop");
					tree.shakeOffset = (Math.random() < 0.5 ? -1 : 1) * 2;
					drawScene();
					setTimeout(() => {
						tree.shakeOffset = 0;
						drawScene();
					}, 100);
				} else {
										playSound("chop");
					playSound("finalChop");
					tree.isFalling = true;
					animateTreeFall(tree);
				}
				break;
			}
		}
	});

	function scheduleAnimationFrame() {
		if (animationDelays.size === 0) return;
		const elapsed = performance.now() - animationStart;
		const untilNextFrame = Math.min(...[...animationDelays].map((delay) => delay - (elapsed % delay)));
		setTimeout(
			() => {
				drawScene();
				scheduleAnimationFrame();
			},
			Math.max(1, untilNextFrame),
		);
	}

	drawScene();
	scheduleAnimationFrame();
}
