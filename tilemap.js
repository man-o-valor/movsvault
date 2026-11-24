window.tilemapData = {
	legend: {
		"*": { tile: [0, 2] }, // double flower
		"^": { tile: [1, 2] }, // single flower
		O: { tile: [0, 1] }, // single rock
		o: { tile: [1, 1] }, // double rock
		t: { object: "oaktree" },
		T: { object: "sprucetree" },
		s: { object: "stump" },
		l: { object: "log" },
		"┌": {
			tile: [
				[6, 0],
				[6, 3],
			],
			delay: 1,
		}, // water
		"┬": {
			tile: [
				[7, 0],
				[7, 3],
			],
			delay: 1,
		},
		"┐": {
			tile: [
				[8, 0],
				[8, 3],
			],
			delay: 1,
		},
		"├": {
			tile: [
				[6, 1],
				[6, 4],
			],
			delay: 1,
		},
		"┼": {
			tile: [
				[7, 1],
				[7, 4],
			],
			delay: 1,
		},
		"┤": {
			tile: [
				[8, 1],
				[8, 4],
			],
			delay: 1,
		},
		"└": {
			tile: [
				[6, 2],
				[6, 5],
			],
			delay: 1,
		},
		"┴": {
			tile: [
				[7, 2],
				[7, 5],
			],
			delay: 1,
		},
		"┘": {
			tile: [
				[8, 2],
				[8, 5],
			],
			delay: 1,
		},
		"╭": {
			tile: [
				[9, 0],
				[9, 2],
			],
			delay: 1,
		},
		"╮": {
			tile: [
				[10, 0],
				[10, 2],
			],
			delay: 1,
		},
		"╰": {
			tile: [
				[9, 1],
				[9, 3],
			],
			delay: 1,
		},
		"╯": {
			tile: [
				[10, 1],
				[10, 3],
			],
			delay: 1,
		},
		"-": { tile: [11, 0] }, // boards
		"[": { tile: [11, 1] },
		"]": { tile: [11, 2] },
		m: { object: "mailbox" },
		"◢": {
			tile: [
				[4, 3],
				[4, 5],
			],
			delay: 1,
		}, // clouds
		"◣": {
			tile: [
				[5, 3],
				[5, 5],
			],
			delay: 1,
		},
		"◥": {
			tile: [
				[4, 4],
				[4, 6],
			],
			delay: 1,
		},
		"◤": {
			tile: [
				[5, 4],
				[5, 6],
			],
			delay: 1,
		},
		"■": { tile: [10, 4] },
		"◿": {
			tile: [
				[0, 4],
				[2, 4],
			],
			delay: 1,
		},
		"◺": {
			tile: [
				[1, 4],
				[3, 4],
			],
			delay: 1,
		},
		"◹": {
			tile: [
				[0, 5],
				[2, 5],
			],
			delay: 1,
		},
		"◸": {
			tile: [
				[1, 5],
				[3, 5],
			],
			delay: 1,
		},
		"◻": { tile: [9, 4] },
	},
	objects: {
		oaktree: {
			x: 4,
			y: 0,
			width: 2,
			height: 3,
		},
		sprucetree: {
			x: 2,
			y: 0,
			width: 2,
			height: 3,
		},
		stump: {
			x: 0,
			y: 3,
			width: 2,
			height: 1,
		},
		log: {
			x: 2,
			y: 3,
			width: 2,
			height: 1,
		},
		mailbox: {
			x: 11,
			y: 3,
			width: 1,
			height: 2,
		},
	}
};
