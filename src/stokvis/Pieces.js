const Pieces = {
	//pnbrqk
	shortToType: function(s) {
		const names = {
			P: 0,
			N: 1,
			B: 2,
			R: 3,
			Q: 4,
			K: 5,
			p: 6,
			n: 7,
			b: 8,
			r: 9,
			q: 10,
			k: 11
		}
		return names[s];
	},
	nameToType: function(name, side) {
		const names = {
			pawn: 0,
			knight: 1,
			bishop: 2,
			rook: 3,
			queen: 4,
			king: 5
		}
		return names[name.toLowerCase()] + 6*(side.toLowerCase() == "white");
	},
	typeToFileName: function(type) {
		const types = ["pawnw", "knightw", "bishopw", "rookw", "queenw", "kingw", "pawnb", "knightb", "bishopb", "rookb", "queenb", "kingb"];
		return types[type];
	}
}