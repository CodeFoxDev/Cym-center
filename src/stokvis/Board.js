class Board {
	constructor(fen) {
		this.fen = fen;
		
		//!!!!!!! castling zobrist key update
		this.piecesLow = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
		this.piecesHigh = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
		this.occupiedLow = [0, 0];
		this.occupiedHigh = [0, 0];
		
		//this.pieceValues = [1, 3, 3.5, 5, 9, 100, -1, -3, -3.5, -5, -9, -100];
		
		this.mgEval = 0;
		this.egEval = 0;
		this.phase = 0;
		
		this.turn = 0; //white
		
		this.movesMade = [];
		this.castlingRightsList = [];
		this.castlingRights = 0;
		this.enPassantLowList = [];
		this.enPassantLow = 0;
		this.enPassantHighList = [];
		this.enPassantHigh = 0;
		this.nMovesMade = 0;
		
		this.squarePieceRandom = new Uint32Array(64*12*2);
		this.castleRandom = new Uint32Array(16*2);
		this.turnRandom = new Uint32Array(2);
		this.enpassantRandom = new Uint32Array(8*2 + 2);
		if(window && window.crypto && window.crypto.getRandomValues && Uint32Array) {
			window.crypto.getRandomValues(this.squarePieceRandom);
			window.crypto.getRandomValues(this.castleRandom);
			window.crypto.getRandomValues(this.turnRandom);
			window.crypto.getRandomValues(this.enpassantRandom);
		}
		else {
			console.log("no random values");
		}
		this.enpassantRandom[16] = 0;
		this.enpassantRandom[17] = 0;

		this.zobristLow = 0;
		this.zobristHigh = 0;
	}
	
	init() {
		FenReader.readFen(this.fen, this);
		repTable.push(this.zobristLow);
		repTable.push(this.zobristHigh);
		for(let p = 0; p < 12; p++) {
			for(let sq = 0; sq < 32; sq++) {
				const mask = 1 << sq;
				if(mask & this.piecesLow[p]) {
					this.phase += gamePhaseInc[p];
					this.mgEval += mgTable[p][sq];
					this.egEval += egTable[p][sq];
				}
				if(mask & this.piecesHigh[p]) {
					this.phase += gamePhaseInc[p];
					this.mgEval += mgTable[p][sq + 32];
					this.egEval += egTable[p][sq + 32];
				}
			}
		}
	}
	
	evaluate() {
		const mgPhase = Math.min(this.phase, 24);
		const egPhase = 24 - mgPhase;
		return (this.mgEval * mgPhase + this.egEval * egPhase) / 24;
	}
	
	makeNullMove() {
		this.zobristLow ^= this.turnRandom[0];
		this.zobristHigh ^= this.turnRandom[1];
		this.enPassantLow = 0;
		this.enPassantHigh = 0;
		this.enPassantLowList.push(0);
		this.enPassantHighList.push(0);
		this.castlingRightsList.push(this.castlingRights);
		this.turn ^= 1;
		this.movesMade.push(0);
		this.nMovesMade++;
	}
	unmakeNullMove() {
		this.zobristLow ^= this.turnRandom[0];
		this.zobristHigh ^= this.turnRandom[1];
		this.enPassantLow = this.enPassantLowList[this.nMovesMade - 1];
		this.enPassantHigh = this.enPassantHighList[this.nMovesMade - 1];
		this.enPassantLowList.pop();
		this.enPassantHighList.pop();
		this.castlingRightsList.pop();
		this.turn ^= 1;
		this.movesMade.pop();
		this.nMovesMade--;
	}
	
	genZobristFromScratch() {
		let zLow = 0;
		let zHigh = 0;
		
		let mask;
		for(let i = 0; i < 32; i++) {
			mask = 1 << i;
			for(let p = 0; p < 12; p++) {
				if(mask & this.piecesLow[p]) {
					zLow ^= this.squarePieceRandom[i*24 + p*2];
					zHigh ^= this.squarePieceRandom[i*24 + p*2 + 1];
				}
				if(mask & this.piecesHigh[p]) {
					zLow ^= this.squarePieceRandom[(i + 32)*24 + p*2];
					zHigh ^= this.squarePieceRandom[(i + 32)*24 + p*2 + 1];
				}
			}
		}
		if(this.turn) {
			zLow ^= this.turnRandom[0];
			zHigh ^= this.turnRandom[1];
		}
		if(this.enPassantLow || this.enPassantHigh) {
			const pos = MoveGen.bbToPos(this.enPassantLow, this.enPassantHigh) % 8;
			zLow ^= this.enpassantRandom[pos*2];
			zHigh ^= this.enpassantRandom[pos*2+1];
		}
		return [zLow, zHigh];
	}
	
	testZobrist(depth) {
		for(let i = 0; i < depth; i++) {
			let moves = MoveGen.genMoves(this);
			this.make(moves[Math.floor(Math.random()*moves.length)]);
			
			const sZobrist = this.genZobristFromScratch();
			if(sZobrist[0] != this.zobristLow || sZobrist[1] != this.zobristHigh) {
				console.log("zobrist error", i);
				break;
			}
		}
	}
	
	unmake(move) {
		const from = move & 63;
		const to = (move & 4032) >>> 6;
		
		let fromLow = 0;
		let fromHigh = 0;
		let toLow = 0;
		let toHigh = 0;
		//can be made branchless by just doing everything
		if(from < 32) {
			fromLow = 1 << from;
		}
		else {
			fromHigh = 1 << from;
		}
		if(to < 32) {
			toLow = 1 << to;
		}
		else {
			toHigh = 1 << to;
		}
		const fromToLow = fromLow | toLow;
		const fromToHigh = fromHigh | toHigh;
		
		//move:
		//0-5: from(63)
		//6-11: to(4032)
		//12-15: piece(61440)
		//16-19: captured piece index(983040)
		//20-21: promotion piece(kbrq)(3145728)
		//22-24: enpassant(29360128)
		//25-28: castling(503316480)
		//29-31: move type(-536870912)
		
		this.turn = this.turn ^ 1;
		this.enPassantLow = this.enPassantLowList[this.nMovesMade-1];
		this.enPassantHigh = this.enPassantHighList[this.nMovesMade-1];
		this.castlingRights = this.castlingRightsList[this.nMovesMade-1];
		
		repTable.pop();
		repTable.pop();
		
		this.makeUnmake(move, fromToLow, fromToHigh, toLow, toHigh, -1);
		
		this.enPassantLowList.pop();
		this.enPassantHighList.pop();
		this.castlingRightsList.pop();
		this.movesMade.pop();
		this.nMovesMade--;
	}
	
	make(move) {
		//can also be defined later or not
		const from = move & 63;
		const to = (move & 4032) >>> 6;
		
		let fromLow = 0;
		let fromHigh = 0;
		let toLow = 0;
		let toHigh = 0;
		//can be made branchless by just doing everything
		if(from < 32) {
			fromLow = 1 << from;
		}
		else {
			fromHigh = 1 << from;
		}
		if(to < 32) {
			toLow = 1 << to;
		}
		else {
			toHigh = 1 << to;
		}
		const fromToLow = fromLow | toLow;
		const fromToHigh = fromHigh | toHigh;
		
		
		//rookBlackLeft = 1, rookBlackRight = 2, rookWhiteLeft = 4, rookWhiteRight = 8
		const castleChangeRooks = 15 - (fromToLow & 1) - ((fromToLow & 128) >>> 6) - ((fromToHigh & 16777216) >>> 22) - ((fromToHigh & -2147483648) >>> 28);
		const castleChangeKings = 15 - ((fromToLow & 16) >>> 4)*3 - ((fromToHigh & 268435456) >>> 28)*12;
		
		this.castlingRights &= castleChangeRooks;
		this.castlingRights &= castleChangeKings;
		
		const enPassantStates = this.makeUnmake(move, fromToLow, fromToHigh, toLow, toHigh, 1);
		this.enPassantLow = enPassantStates[0];
		this.enPassantHigh = enPassantStates[1];
		
		repTable.push(this.zobristLow, this.zobristHigh);
		
		this.turn = this.turn ^ 1;
		this.enPassantLowList.push(this.enPassantLow);
		this.enPassantHighList.push(this.enPassantHigh);
		this.castlingRightsList.push(this.castlingRights);
		this.movesMade.push(move);
		this.nMovesMade++;
	}
	
	makeUnMakeSimple(move, fromToLow, fromToHigh, toLow, toHigh) {
		const turnOffset = this.turn*6;
		const piece = ((move & 28672) >>> 12) + turnOffset;
		const captured = ((move & 229376) >>> 15) + (turnOffset ^ 6);
		const type = move >>> 18;

		this.occupiedLow[this.turn] ^= fromToLow;
		this.occupiedHigh[this.turn] ^= fromToHigh;

		if(type & 8) {//promotion
			const promotion = (type & 3) + 1 + turnOffset;
			this.piecesLow[piece] ^= fromToLow ^ toLow;
			this.piecesHigh[piece] ^= fromToHigh ^ toHigh;
			this.piecesLow[promotion] ^= toLow;
			this.piecesHigh[promotion] ^= toHigh;
		}
		else {//not a promotion
			this.piecesLow[piece] ^= fromToLow;
			this.piecesHigh[piece] ^= fromToHigh;
		}
		
		if(type & 4) {//capture
			let capToLow = toLow;
			let capToHigh = toHigh;
			if(type == 5) {//en passant
				capToLow <<= 8;
				capToHigh >>>= 8;
			}
			
			this.occupiedLow[this.turn ^ 1] ^= capToLow;
			this.occupiedHigh[this.turn ^ 1] ^= capToHigh;
			
			this.piecesLow[captured] ^= capToLow;
			this.piecesHigh[captured] ^= capToHigh;
		}
		
		if((type & 14) == 2) {//castle
			const castleSide = (type & 1)^1 + (this.turn^1)*2;
			const rookFromToLow = [9, 160, 0, 0][castleSide];
			const rookFromToHigh = [0, 0, 150994944, -1610612736][castleSide];
			const rookIndex = 3 + turnOffset;

			this.piecesLow[rookIndex] ^= rookFromToLow;
			this.piecesHigh[rookIndex] ^= rookFromToHigh;
			this.occupiedLow[this.turn] ^= rookFromToLow;
			this.occupiedHigh[this.turn] ^= rookFromToHigh;
		}
	}
	
	makeUnmake(move, fromToLow, fromToHigh, toLow, toHigh, reverse) {
		//old move:
		//0-5: from(63)
		//6-11: to(4032)
		//12-15: piece(61440)
		//16-19: captured piece index(983040)
		//20-21: promotion piece(nbrq)(3145728)
		//22-24: enpassant(29360128)
		//25-28: castling(503316480)
		//29-31: move type(-536870912)
		
		//new move (22 bits):
		//0-5: from(63)
		//6-11: to(4032)
		//12-14: piece (1 bit less) (28672)
		//15-17: captured piece index (1 bit less) (229376)
		//18-21: type (https://www.chessprogramming.org/Encoding_Moves) (3932160)
		
		const turnOffset = this.turn*6;
		const from = move & 63;
		const to = (move & 4032) >>> 6;
		const piece = ((move & 28672) >>> 12) + turnOffset;
		const captured = ((move & 229376) >>> 15) + (turnOffset ^ 6);
		const type = move >>> 18;
		
		let epLow = 0;
		let epHigh = 0;
		let fromIndex = from*24 + piece*2;;
		let toIndex;
		let mgScoreChange = -mgTable[piece][from];
		let egScoreChange = -egTable[piece][from];
		let phaseChange = 0;
		
		this.occupiedLow[this.turn] ^= fromToLow;
		this.occupiedHigh[this.turn] ^= fromToHigh;

		if(type & 8) {//promotion
			const promotion = (type & 3) + 1 + turnOffset;
			this.piecesLow[piece] ^= fromToLow ^ toLow;
			this.piecesHigh[piece] ^= fromToHigh ^ toHigh;
			this.piecesLow[promotion] ^= toLow;
			this.piecesHigh[promotion] ^= toHigh;

			//zobrist key indexing
			toIndex = to*24 + promotion*2;

			mgScoreChange += mgTable[piece][to];
			egScoreChange += egTable[piece][to];
			phaseChange += gamePhaseInc[promotion];
		}
		else {//not a promotion
			this.piecesLow[piece] ^= fromToLow;
			this.piecesHigh[piece] ^= fromToHigh;
			
			//zobrist key indexing
			toIndex = to*24 + piece*2;
			
			//score change
			mgScoreChange += mgTable[piece][to];
			egScoreChange += egTable[piece][to];
		}
		
		if(type & 4) {//capture
			let capToLow = toLow;
			let capToHigh = toHigh;
			let capToIndex = to*24 + captured*2;
			if(type == 5) {//en passant
				capToLow <<= 8;
				capToHigh >>>= 8;
				capToIndex -= (this.turn*16-8)*24;
			}
			
			this.occupiedLow[this.turn ^ 1] ^= capToLow;
			this.occupiedHigh[this.turn ^ 1] ^= capToHigh;
			
			this.piecesLow[captured] ^= capToLow;
			this.piecesHigh[captured] ^= capToHigh;
			
			//zobrist hash
			this.zobristLow ^= this.squarePieceRandom[capToIndex];
			this.zobristHigh ^= this.squarePieceRandom[capToIndex + 1];

			//score change
			mgScoreChange -= mgTable[captured][to];
			egScoreChange -= egTable[captured][to];
			phaseChange -= gamePhaseInc[captured];
		}
		
		if((type & 14) == 2) {//castle
			const castleSide = (type & 1)^1 + (this.turn^1)*2;
			const rookIndex = 3 + turnOffset;
			const rookFromToLow = [9, 160, 0, 0][castleSide];
			const rookFromToHigh = [0, 0, 150994944, -1610612736][castleSide];
			
			const rookFrom = [0, 7, 56, 63][castleSide];
			const rookTo = [3, 5, 59, 61][castleSide];
			const rookFromIndex = rookFrom*24 + rookIndex*24;
			const rookToIndex = rookTo*24 + rookIndex*24;

			this.piecesLow[rookIndex] ^= rookFromToLow;
			this.piecesHigh[rookIndex] ^= rookFromToHigh;
			this.occupiedLow[this.turn] ^= rookFromToLow;
			this.occupiedHigh[this.turn] ^= rookFromToHigh;

			this.zobristLow ^= this.squarePieceRandom[rookFromIndex];
			this.zobristHigh ^= this.squarePieceRandom[rookFromIndex + 1];
			this.zobristLow ^= this.squarePieceRandom[rookToIndex];
			this.zobristHigh ^= this.squarePieceRandom[rookToIndex + 1];
			
			mgScoreChange += mgTable[rookIndex][rookTo] - mgTable[rookIndex][rookFrom];
			egScoreChange += egTable[rookIndex][rookTo] - egTable[rookIndex][rookFrom];
		}
		if(type == 1) {//double pawn push
			epLow = toLow >>> 8;
			epHigh = toHigh << 8;
		}
		
		//zobrist key update
		this.zobristLow ^= this.turnRandom[0];
		this.zobristHigh ^= this.turnRandom[1];
		
		this.zobristLow ^= this.squarePieceRandom[fromIndex];
		this.zobristHigh ^= this.squarePieceRandom[fromIndex + 1];
		this.zobristLow ^= this.squarePieceRandom[toIndex];
		this.zobristHigh ^= this.squarePieceRandom[toIndex + 1];
		
		const epPos = (MoveGen.bbToPos(this.enPassantLow, this.enPassantHigh) % 8) * 2 + (this.enPassantLow + this.enPassantHigh == 0)*16;
		this.zobristLow ^= this.enpassantRandom[epPos];
		this.zobristHigh ^= this.enpassantRandom[epPos+1];
		
		const epPosNext = (MoveGen.bbToPos(epLow, epHigh) % 8) * 2 + (epLow + epHigh == 0)*16;
		this.zobristLow ^= this.enpassantRandom[epPosNext];
		this.zobristHigh ^= this.enpassantRandom[epPosNext+1];

		this.mgEval += mgScoreChange * reverse;
		this.egEval += egScoreChange * reverse;
		this.phase += phaseChange * reverse;
		
		return [epLow, epHigh];
	}
	
	moveToInt(move) {
		if(typeof(move) != "string") {
			return undefined;
		}
		
		let from;
		let to;
		let fromToInt;
		try {
			from = FenReader.squareToPos(move.split("-")[0]);
			to = FenReader.squareToPos(move.split("-")[1]);
			fromToInt = from | (to << 6);
		}
		catch {
			return undefined;
		}
		
		const legalMoves = MoveGen.genMoves(this);
		
		let moveInt;
		for(let i of legalMoves) {
			if((i & 4095) == fromToInt) {
				moveInt = i;
				break;
			}
		}
		if(moveInt == undefined) {
			return undefined;
		}
		
		this.make(moveInt);
		return moveInt;
	}
}