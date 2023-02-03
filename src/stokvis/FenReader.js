class FenReader {
	static readFen(fen, board) {	
		const elements = fen.split(" ");
		FenReader.setPositions(elements, board);
		
		if(elements[2].indexOf("q") != -1) {
			board.castlingRights += 1;
		}
		if(elements[2].indexOf("k") != -1) {
			board.castlingRights += 2;
		}
		if(elements[2].indexOf("K") != -1) {
			board.castlingRights += 4;
		}
		if(elements[2].indexOf("Q") != -1) {
			board.castlingRights += 8;
		}
		board.castlingRightsList.push(board.castlingRights);
		
		if(elements[3] != "-") {
			const bb = this.posToBb(this.squareToPos(elements[3]));
			board.enPassantLow = bb[0];
			board.enPassantHigh = bb[1];
		}
		board.enPassantLowList.push(board.enPassantLow);
		board.enPassantHighList.push(board.enPassantHigh);
		
		board.turn = (elements[1] == "b")*1;
		
		const zobristKey = board.genZobristFromScratch();
		board.zobristLow = zobristKey[0];
		board.zobristHigh = zobristKey[1];
	}
	
	static posToBb(square) {
		if(square < 32) {
			return [2**square, 0];
		}
		else {
			return [0, 2**(square - 32)];
		}
	}
	
	static bbToPos(bb) {
		if(bb[0] == 0) {
			return Math.log2(bb[1]) + 32;
		}
		else if(bb[1] == 0) {
			return Math.log2(bb[0]);
		}
		return -1;
	}
	
	static squareToPos(square) {
		const file = square.split("")[0];
		const rank = square.split("")[1];
		const fileNumObj = {a: 0, b: 1, c:2, d:3, e:4, f:5, g:6, h:7};
		
		return (8-rank)*8 + fileNumObj[file];
	}
	
	static setPositions(elements, board) {
		const ranks = elements[0].split("/");
		
		const castling = elements[2].split("");
		
		for(let r = 0; r < 8; r++) {
			let rank = ranks[r];
			
			let f = 0;
			for(let i = 0; i < rank.length; i++) {
				if(rank[i] <= "9" && rank[i] >= "0") {
					f += parseInt(rank[i], 10);
				}
				else {
					const type = Pieces.shortToType(rank[i]);
					const posBb = this.posToBb(f + r*8);
					board.piecesLow[type] |= posBb[0];
					board.piecesHigh[type] |= posBb[1];
					if(type < 6) {
						board.occupiedLow[0] |= posBb[0];
						board.occupiedHigh[0] |= posBb[1];
					}
					else {
						board.occupiedLow[1] |= posBb[0];
						board.occupiedHigh[1] |= posBb[1];
					}
					
					f++;
				}
			}
		}
	}
}