const MoveGen = (function() {
	//http://talkchess.com/forum3/viewtopic.php?t=72461
	//all arrays are 64 containing half bitboards
	let bishopLow = []; //[64]
	let bishopHigh = []; //[64]
	let rookLow = [];
	let rookHigh = [];
	let knightLow = [];
	let knightHigh = [];
	let whitePawnLow = [];
	let whitePawnHigh = [];
	let blackPawnLow = [];
	let blackPawnHigh = [];
	let kingLow = [];
	let kingHigh = [];
	
	const debruijn = 124511785;
	const debruijnTable = [];
	(function initTable() {
		for(let i = 0; i < 32; i++) {
			debruijnTable[((1 << i) * debruijn) >>> 27] = i;
		}
	})();
	
	function posToBb(square) {
		if(square < 32) {
			return [1 << square, 0];
		}
		else {
			return [0, 1 << square];
		}
	}
	
	function bbToPos(low, high) {
		return debruijnTable[(debruijn * (low + high)) >>> 27] + 32 * (low == 0);
	}
	
	(function pregenBishopAndRookMoves() {
		function addDir(sx, sy, dx, dy, bb) {
			let x = sx + dx;
			let y = sy + dy;
			let dirBb = [0, 0];
			while(x < 8 && x > -1 && y < 8 && y > -1) {
				const addBb = posToBb(x + y*8);
				dirBb[0] ^= addBb[0];
				dirBb[1] ^= addBb[1];
				x += dx;
				y += dy;
			}
			bb[0].push(dirBb[0]);
			bb[1].push(dirBb[1]);
		}
		function addPos(x, y, bb) {
			if(x < 8 && x > -1 && y < 8 && y > -1) {
				const addBb = posToBb(x + y*8);
				bb[0] ^= addBb[0];
				bb[1] ^= addBb[1];
			}
		}
		
		for(let i = 0; i < 64; i++) {
			const f = i % 8;
			const r = i >>> 3;
			const bishop = [[], []];
			const rook = [[], []];
			const knight = [0, 0];
			
			const whitePawn = [0, 0];
			const blackPawn = [0, 0];
			
			const king = [0, 0];
			
			//bishop
			addDir(f, r, 1, 1, bishop);
			addDir(f, r, 1, -1, bishop);
			addDir(f, r, -1, -1, bishop);
			addDir(f, r, -1, 1, bishop);
			
			//rook
			addDir(f, r, 1, 0, rook);
			addDir(f, r, 0, -1, rook);
			addDir(f, r, -1, 0, rook);
			addDir(f, r, 0, 1, rook);
			
			//knight
			addPos(f + 1, r + 2, knight);
			addPos(f + 1, r - 2, knight);
			addPos(f - 1, r - 2, knight);
			addPos(f - 1, r + 2, knight);
			
			addPos(f + 2, r + 1, knight);
			addPos(f + 2, r - 1, knight);
			addPos(f - 2, r - 1, knight);
			addPos(f - 2, r + 1, knight);
			
			//pawn
			addPos(f - 1, r - 1, whitePawn);
			addPos(f + 1, r - 1, whitePawn);
			
			addPos(f - 1, r + 1, blackPawn);
			addPos(f + 1, r + 1, blackPawn);
			
			addPos(f + 1, r + 1, king);
			addPos(f + 1, r, king);
			addPos(f + 1, r - 1, king);
			addPos(f, r - 1, king);
			addPos(f - 1, r - 1, king);
			addPos(f - 1, r, king);
			addPos(f - 1, r + 1, king);
			addPos(f, r + 1, king);
			
			
			bishopLow.push(bishop[0]);
			bishopHigh.push(bishop[1]);
			rookLow.push(rook[0]);
			rookHigh.push(rook[1]);
			knightLow.push(knight[0]);
			knightHigh.push(knight[1]);
			whitePawnLow.push(whitePawn[0]);
			whitePawnHigh.push(whitePawn[1]);
			blackPawnLow.push(blackPawn[0]);
			blackPawnHigh.push(blackPawn[1]);
			kingLow.push(king[0]);
			kingHigh.push(king[1]);
		}
	})();
	
	function genSliderMovesMax(bbLow, bbHigh, obstaclesLow, obstaclesHigh) {
		//x & -x for lowest 1 then x - 1 for all 1s below
		
		//mask = bb & obstacles
		//minMask = (mask & -mask) - 1
		const maskLow = bbLow & obstaclesLow;
		const maskHigh = bbHigh & obstaclesHigh;
		
		//the lowest set bits per 32bit number
		let minMaskLow = maskLow & -maskLow;
		let minMaskHigh = maskHigh & -maskHigh;
		
		if(minMaskLow == 0) {
			minMaskHigh |= minMaskHigh - 1;
		}
		else if(minMaskHigh != -1) {
			minMaskHigh = 0;
		}
		/*if(minMaskHigh == 0) {
			if(minMaskLow == 0) {
				minMaskHigh |= minMaskHigh - 1;
			}
		}
		else {
			if(minMaskLow == 0) {
				minMaskHigh |= minMaskHigh - 1;
			}
			else {
				minMaskHigh = 0;
			}
		}*/
		minMaskLow |= minMaskLow - 1;
		return [bbLow & minMaskLow, bbHigh & minMaskHigh];
	}
	function genSliderCaptureMax(bbLow, bbHigh, obstaclesLow, obstaclesHigh) {
		const maskLow = bbLow & obstaclesLow;
		const maskHigh = bbHigh & obstaclesHigh;
		
		const toLow = maskLow & -maskLow;
		const toHigh = maskHigh & -maskHigh;
		return [toLow, toHigh & -(toLow == 0)];
	}
	function genSliderMovesMin(bbLow, bbHigh, obstaclesLow, obstaclesHigh) {
		//find highest 1(y) and x = x - y .. repeat
		
		let maskLow = bbLow & obstaclesLow;
		let maskHigh = bbHigh & obstaclesHigh;
		
		let minMaskLow = 0;
		let minMaskHigh = 0;
		
		while(maskLow) {
			minMaskLow = maskLow & -maskLow;
			maskLow -= minMaskLow;
		}
		while(maskHigh) {
			minMaskHigh = maskHigh & -maskHigh;
			maskHigh -= minMaskHigh;
		}
		
		if(minMaskHigh == 0) {
			if(minMaskLow != 0) {
				minMaskLow -= 1;
			}
			minMaskLow = ~minMaskLow;
		}
		else {
			minMaskHigh -= 1;
			minMaskLow = 0;
		}
		minMaskHigh = ~minMaskHigh;
		
		return [bbLow & minMaskLow, bbHigh & minMaskHigh];
	}
	function genSliderCaptureMin(bbLow, bbHigh, obstaclesLow, obstaclesHigh) {
		let maskLow = bbLow & obstaclesLow;
		let maskHigh = bbHigh & obstaclesHigh;
		
		let helpLow = 0;
		while(maskLow) {
			helpLow = maskLow & -maskLow;
			maskLow -= helpLow;
		}
		
		let helpHigh = 0;
		while(maskHigh) {
			helpHigh = maskHigh & -maskHigh;
			maskHigh -= helpHigh;
		}
		
		return [helpLow & -(helpHigh == 0), helpHigh];
	}
	//move:
	//0-5: from(63)
	//6-11: to(4032)
	//12-15: piece(61440)
	//16-19: captured piece index(983040)
	//20-21: promotion piece(kbrq)(3145728)
	//22-24: enpassant(29360128)
	//25-28: castling(503316480)
	//29-31: move type(-536870912)
	function moveBbToMoveList(from, toLow, toHigh, piece, list) {
		//bbToPos
		const extra = from | (piece << 12);
		
		let helpMask;
		while(toLow) {
			helpMask = toLow & -toLow;
			toLow -= helpMask;
			list.push((debruijnTable[(helpMask * debruijn) >>> 27] << 6) | extra);
		}
		while(toHigh) {
			helpMask = toHigh & -toHigh;
			toHigh -= helpMask;
			list.push(((debruijnTable[(helpMask * debruijn) >>> 27] + 32) << 6) | extra);
		}
	}
	function captureBbToMoveList(from, toLow, toHigh, piece, board, list) {
		const extra = from | 1048576 | (piece << 12); //1048576 = 4 << 18
		
		const turnOffset = !board.turn * 6;
		
		let helpMask;
		let to;
		let index;
		while(toLow) {
			helpMask = toLow & -toLow;
			toLow -= helpMask;
			to = debruijnTable[(helpMask * debruijn) >>> 27];
			
			index = 0;
			index |= ((board.piecesLow[turnOffset+1]&helpMask) >>> to);
			index |= ((board.piecesLow[turnOffset+2]&helpMask) >>> to)*2;
			index |= ((board.piecesLow[turnOffset+3]&helpMask) >>> to)*3;
			index |= ((board.piecesLow[turnOffset+4]&helpMask) >>> to)*4;
			list.push((to << 6) | (index << 15) | extra);
		}
		while(toHigh) {
			helpMask = toHigh & -toHigh;
			toHigh -= helpMask;
			to = debruijnTable[(helpMask * debruijn) >>> 27];
			
			index = 0;
			index |= ((board.piecesHigh[turnOffset+1]&helpMask) >>> to);
			index |= ((board.piecesHigh[turnOffset+2]&helpMask) >>> to)*2;
			index |= ((board.piecesHigh[turnOffset+3]&helpMask) >>> to)*3;
			index |= ((board.piecesHigh[turnOffset+4]&helpMask) >>> to)*4;
			list.push(((to + 32) << 6) | (index << 15) | extra);
		}
	}
	
	function genRookMoves(rookBb, enemy, friendly, index, board, allMoves, allCaptures) {
		const obstaclesLow = enemy[0] | friendly[0];
		const obstaclesHigh = enemy[1] | friendly[1];
		let rookPosLow = rookBb[0];
		
		let helpMask;
		let s;
		let rookToLow;
		let rookToHigh;
		while(rookPosLow) {
			helpMask = rookPosLow & -rookPosLow;
			rookPosLow -= helpMask;
			
			s = debruijnTable[(helpMask * debruijn) >>> 27];
			rookToLow = rookLow[s];
			rookToHigh = rookHigh[s];
			
			const bb0 = genSliderMovesMax(rookToLow[0], rookToHigh[0], obstaclesLow, obstaclesHigh);
			const bb1 = genSliderMovesMin(rookToLow[1], rookToHigh[1], obstaclesLow, obstaclesHigh);
			const bb2 = genSliderMovesMin(rookToLow[2], rookToHigh[2], obstaclesLow, obstaclesHigh);
			const bb3 = genSliderMovesMax(rookToLow[3], rookToHigh[3], obstaclesLow, obstaclesHigh);
			const allTo = [bb0[0] | bb1[0] | bb2[0] | bb3[0], bb0[1] | bb1[1] | bb2[1] | bb3[1]];
			const capturesTo = [allTo[0] & enemy[0], allTo[1] & enemy[1]];
			const movesTo = [allTo[0] & ~obstaclesLow, allTo[1] & ~obstaclesHigh];
			moveBbToMoveList(s, movesTo[0], movesTo[1], index, allMoves);
			captureBbToMoveList(s, capturesTo[0], capturesTo[1], index, board, allCaptures);
		}
		
		let rookPosHigh = rookBb[1];
		while(rookPosHigh) {
			helpMask = rookPosHigh & -rookPosHigh;
			rookPosHigh -= helpMask;
			
			s = debruijnTable[(helpMask * debruijn) >>> 27] + 32;
			rookToLow = rookLow[s];
			rookToHigh = rookHigh[s];
			
			const bb0 = genSliderMovesMax(rookToLow[0], rookToHigh[0], obstaclesLow, obstaclesHigh);
			const bb1 = genSliderMovesMin(rookToLow[1], rookToHigh[1], obstaclesLow, obstaclesHigh);
			const bb2 = genSliderMovesMin(rookToLow[2], rookToHigh[2], obstaclesLow, obstaclesHigh);
			const bb3 = genSliderMovesMax(rookToLow[3], rookToHigh[3], obstaclesLow, obstaclesHigh);
			const allTo = [bb0[0] | bb1[0] | bb2[0] | bb3[0], bb0[1] | bb1[1] | bb2[1] | bb3[1]];
			const capturesTo = [allTo[0] & enemy[0], allTo[1] & enemy[1]];
			const movesTo = [allTo[0] & ~obstaclesLow, allTo[1] & ~obstaclesHigh];
			moveBbToMoveList(s, movesTo[0], movesTo[1], index, allMoves);
			captureBbToMoveList(s, capturesTo[0], capturesTo[1], index, board, allCaptures);
		}
	}
	function genRookCaptures(rookBb, enemy, friendly, index, board, allCaptures) {
		const obstaclesLow = enemy[0] | friendly[0];
		const obstaclesHigh = enemy[1] | friendly[1];
		let rookPosLow = rookBb[0];
		
		let helpMask;
		let s;
		let rookToLow;
		let rookToHigh;
		while(rookPosLow) {
			helpMask = rookPosLow & -rookPosLow;
			rookPosLow -= helpMask;
			
			s = debruijnTable[(helpMask * debruijn) >>> 27];
			rookToLow = rookLow[s];
			rookToHigh = rookHigh[s];
			
			const bb0 = genSliderCaptureMax(rookToLow[0], rookToHigh[0], obstaclesLow, obstaclesHigh);
			const bb1 = genSliderCaptureMin(rookToLow[1], rookToHigh[1], obstaclesLow, obstaclesHigh);
			const bb2 = genSliderCaptureMin(rookToLow[2], rookToHigh[2], obstaclesLow, obstaclesHigh);
			const bb3 = genSliderCaptureMax(rookToLow[3], rookToHigh[3], obstaclesLow, obstaclesHigh);
			const capturesTo = [(bb0[0] | bb1[0] | bb2[0] | bb3[0]) & enemy[0], (bb0[1] | bb1[1] | bb2[1] | bb3[1]) & enemy[1]];
			captureBbToMoveList(s, capturesTo[0], capturesTo[1], index, board, allCaptures);
		}
		
		let rookPosHigh = rookBb[1];
		while(rookPosHigh) {
			helpMask = rookPosHigh & -rookPosHigh;
			rookPosHigh -= helpMask;
			
			s = debruijnTable[(helpMask * debruijn) >>> 27] + 32;
			rookToLow = rookLow[s];
			rookToHigh = rookHigh[s];
			
			const bb0 = genSliderCaptureMax(rookToLow[0], rookToHigh[0], obstaclesLow, obstaclesHigh);
			const bb1 = genSliderCaptureMin(rookToLow[1], rookToHigh[1], obstaclesLow, obstaclesHigh);
			const bb2 = genSliderCaptureMin(rookToLow[2], rookToHigh[2], obstaclesLow, obstaclesHigh);
			const bb3 = genSliderCaptureMax(rookToLow[3], rookToHigh[3], obstaclesLow, obstaclesHigh);
			const capturesTo = [(bb0[0] | bb1[0] | bb2[0] | bb3[0]) & enemy[0], (bb0[1] | bb1[1] | bb2[1] | bb3[1]) & enemy[1]];
			captureBbToMoveList(s, capturesTo[0], capturesTo[1], index, board, allCaptures);
		}
	}

	function genBishopMoves(bishopBb, enemy, friendly, index, board, allMoves, allCaptures) {
		const obstaclesLow = enemy[0] | friendly[0];
		const obstaclesHigh = enemy[1] | friendly[1];
		
		let bishopPosLow = bishopBb[0];
		
		let helpMask;
		let s;
		let bishopToLow;
		let bishopToHigh;
		while(bishopPosLow) {
			helpMask = bishopPosLow & -bishopPosLow;
			bishopPosLow -= helpMask;
			
			s = debruijnTable[(helpMask * debruijn) >>> 27];
			bishopToLow = bishopLow[s];
			bishopToHigh = bishopHigh[s];
			
			const bb0 = genSliderMovesMax(bishopToLow[0], bishopToHigh[0], obstaclesLow, obstaclesHigh);
			const bb1 = genSliderMovesMin(bishopToLow[1], bishopToHigh[1], obstaclesLow, obstaclesHigh);
			const bb2 = genSliderMovesMin(bishopToLow[2], bishopToHigh[2], obstaclesLow, obstaclesHigh);
			const bb3 = genSliderMovesMax(bishopToLow[3], bishopToHigh[3], obstaclesLow, obstaclesHigh);
			const allTo = [bb0[0] | bb1[0] | bb2[0] | bb3[0], bb0[1] | bb1[1] | bb2[1] | bb3[1]];
			const capturesTo = [allTo[0] & enemy[0], allTo[1] & enemy[1]];
			const movesTo = [allTo[0] & ~obstaclesLow, allTo[1] & ~obstaclesHigh];
			moveBbToMoveList(s, movesTo[0], movesTo[1], index, allMoves);
			captureBbToMoveList(s, capturesTo[0], capturesTo[1], index, board, allCaptures);
		}
		
		let bishopPosHigh = bishopBb[1];
		while(bishopPosHigh) {
			helpMask = bishopPosHigh & -bishopPosHigh;
			bishopPosHigh -= helpMask;
			
			s = debruijnTable[(helpMask * debruijn) >>> 27] + 32;
			bishopToLow = bishopLow[s];
			bishopToHigh = bishopHigh[s];
			
			const bb0 = genSliderMovesMax(bishopToLow[0], bishopToHigh[0], obstaclesLow, obstaclesHigh, 9, s);
			const bb1 = genSliderMovesMin(bishopToLow[1], bishopToHigh[1], obstaclesLow, obstaclesHigh, 7, s);
			const bb2 = genSliderMovesMin(bishopToLow[2], bishopToHigh[2], obstaclesLow, obstaclesHigh, 9, s);
			const bb3 = genSliderMovesMax(bishopToLow[3], bishopToHigh[3], obstaclesLow, obstaclesHigh, 7, s);
			const allTo = [bb0[0] | bb1[0] | bb2[0] | bb3[0], bb0[1] | bb1[1] | bb2[1] | bb3[1]];
			const capturesTo = [allTo[0] & enemy[0], allTo[1] & enemy[1]];
			const movesTo = [allTo[0] & ~obstaclesLow, allTo[1] & ~obstaclesHigh];
			moveBbToMoveList(s, movesTo[0], movesTo[1], index, allMoves);
			captureBbToMoveList(s, capturesTo[0], capturesTo[1], index, board, allCaptures);
		}
	}
	function genBishopCaptures(bishopBb, enemy, friendly, index, board, allCaptures) {
		const obstaclesLow = enemy[0] | friendly[0];
		const obstaclesHigh = enemy[1] | friendly[1];
		
		let bishopPosLow = bishopBb[0];
		
		let helpMask;
		let s;
		let bishopToLow;
		let bishopToHigh;
		while(bishopPosLow) {
			helpMask = bishopPosLow & -bishopPosLow;
			bishopPosLow -= helpMask;
			
			s = debruijnTable[(helpMask * debruijn) >>> 27];
			bishopToLow = bishopLow[s];
			bishopToHigh = bishopHigh[s];
			
			const bb0 = genSliderCaptureMax(bishopToLow[0], bishopToHigh[0], obstaclesLow, obstaclesHigh);
			const bb1 = genSliderCaptureMin(bishopToLow[1], bishopToHigh[1], obstaclesLow, obstaclesHigh);
			const bb2 = genSliderCaptureMin(bishopToLow[2], bishopToHigh[2], obstaclesLow, obstaclesHigh);
			const bb3 = genSliderCaptureMax(bishopToLow[3], bishopToHigh[3], obstaclesLow, obstaclesHigh);
			const capturesTo = [(bb0[0] | bb1[0] | bb2[0] | bb3[0]) & enemy[0], (bb0[1] | bb1[1] | bb2[1] | bb3[1]) & enemy[1]];
			captureBbToMoveList(s, capturesTo[0], capturesTo[1], index, board, allCaptures);
		}
		
		let bishopPosHigh = bishopBb[1];
		while(bishopPosHigh) {
			helpMask = bishopPosHigh & -bishopPosHigh;
			bishopPosHigh -= helpMask;
			
			s = debruijnTable[(helpMask * debruijn) >>> 27] + 32;
			bishopToLow = bishopLow[s];
			bishopToHigh = bishopHigh[s];
			
			const bb0 = genSliderCaptureMax(bishopToLow[0], bishopToHigh[0], obstaclesLow, obstaclesHigh);
			const bb1 = genSliderCaptureMin(bishopToLow[1], bishopToHigh[1], obstaclesLow, obstaclesHigh);
			const bb2 = genSliderCaptureMin(bishopToLow[2], bishopToHigh[2], obstaclesLow, obstaclesHigh);
			const bb3 = genSliderCaptureMax(bishopToLow[3], bishopToHigh[3], obstaclesLow, obstaclesHigh);
			const capturesTo = [(bb0[0] | bb1[0] | bb2[0] | bb3[0]) & enemy[0], (bb0[1] | bb1[1] | bb2[1] | bb3[1]) & enemy[1]];
			captureBbToMoveList(s, capturesTo[0], capturesTo[1], index, board, allCaptures);
		}
	}

	function genQueenMoves(queenBb, enemy, friendly, index, board, allMoves, allCaptures) {
		genRookMoves(queenBb, enemy, friendly, index, board, allMoves, allCaptures);
		genBishopMoves(queenBb, enemy, friendly, index, board, allMoves, allCaptures);
	}
	function genQueenCaptures(queenBb, enemy, friendly, index, board, allCaptures) {
		genRookCaptures(queenBb, enemy, friendly, index, board, allCaptures);
		genBishopCaptures(queenBb, enemy, friendly, index, board, allCaptures);
	}
	
	function genKnightMoves(knightBb, enemy, friendly, index, board, allMoves, allCaptures) {
		const obstacles = [enemy[0] | friendly[0], enemy[1] | friendly[1]];
		
		let knightPosLow = knightBb[0];
		
		let helpMask;
		let s;
		while(knightPosLow) {
			helpMask = knightPosLow & -knightPosLow;
			knightPosLow -= helpMask;
			s = debruijnTable[(helpMask * debruijn) >>> 27];
			
			const movesToLow = knightLow[s] & ~obstacles[0];
			const movesToHigh = knightHigh[s] & ~obstacles[1];
			const capturesToLow = knightLow[s] & enemy[0];
			const capturesToHigh = knightHigh[s] & enemy[1];
			
			moveBbToMoveList(s, movesToLow, movesToHigh, index, allMoves);
			captureBbToMoveList(s, capturesToLow, capturesToHigh, index, board, allCaptures);
		}
		
		let knightPosHigh = knightBb[1];
		while(knightPosHigh) {
			helpMask = knightPosHigh & -knightPosHigh;
			knightPosHigh -= helpMask;
			s = debruijnTable[(helpMask * debruijn) >>> 27] + 32;
			
			const movesToLow = knightLow[s] & ~obstacles[0];
			const movesToHigh = knightHigh[s] & ~obstacles[1];
			const capturesToLow = knightLow[s] & enemy[0];
			const capturesToHigh = knightHigh[s] & enemy[1];
			
			moveBbToMoveList(s, movesToLow, movesToHigh, index, allMoves);
			captureBbToMoveList(s, capturesToLow, capturesToHigh, index, board, allCaptures);
		}
	}
	function genKnightCaptures(knightBb, enemy, index, board, allCaptures) {
		let helpMask;
		let s;
		
		let knightPosLow = knightBb[0];
		while(knightPosLow) {
			helpMask = knightPosLow & -knightPosLow;
			knightPosLow -= helpMask;
			s = debruijnTable[(helpMask * debruijn) >>> 27];
			
			const capturesToLow = knightLow[s] & enemy[0];
			const capturesToHigh = knightHigh[s] & enemy[1];
			
			captureBbToMoveList(s, capturesToLow, capturesToHigh, index, board, allCaptures);
		}
		
		let knightPosHigh = knightBb[1];
		while(knightPosHigh) {
			helpMask = knightPosHigh & -knightPosHigh;
			knightPosHigh -= helpMask;
			s = debruijnTable[(helpMask * debruijn) >>> 27] + 32;
			
			const capturesToLow = knightLow[s] & enemy[0];
			const capturesToHigh = knightHigh[s] & enemy[1];
			
			captureBbToMoveList(s, capturesToLow, capturesToHigh, index, board, allCaptures);
		}
	}
	
	function genWhitePawnMoves(pawnBb, enemy, friendly, board, allMoves, allCaptures, allPromotions) {
		const emptyLow = ~(enemy[0] | friendly[0]);
		const emptyHigh = ~(enemy[1] | friendly[1]);
		//>>
		//16711680 are all the pawns on second rank
		const singlePushes = [((pawnBb[0] >>> 8) | (pawnBb[1] << 24)) & emptyLow, (pawnBb[1] >>> 8) & emptyHigh];
		let singlePushesLow = singlePushes[0] & -256;
		let singlePushesHigh = singlePushes[1];
		let promotions = singlePushes[0] & 255;
		
		//third rank = 65280
		let doublePushes = ((singlePushesHigh & 65280) >>> 8) & emptyHigh;
		
		//from | (piece << 12)
		//single pushes
		let helpMask;
		let to;
		while(singlePushesLow) {
			helpMask = singlePushesLow & -singlePushesLow;
			singlePushesLow -= helpMask;
			to = debruijnTable[(helpMask * debruijn) >>> 27];
			allMoves.push((to + 8) | (to << 6));
		}
		while(singlePushesHigh) {
			helpMask = singlePushesHigh & -singlePushesHigh;
			singlePushesHigh -= helpMask;
			to = debruijnTable[(helpMask * debruijn) >>> 27] + 32;
			allMoves.push((to + 8) | (to << 6));
		}
		
		let promMove;
		while(promotions) {
			helpMask = promotions & -promotions;
			promotions -= helpMask;
			to = debruijnTable[(helpMask * debruijn) >>> 27];
			promMove = (to + 8) | (to << 6) | 2097152; //8 << 18
			//0-3 << 20
			allPromotions.push(promMove | (3 << 18));
			allPromotions.push(promMove | (2 << 18));
			allPromotions.push(promMove | (1 << 18));
			allPromotions.push(promMove);
		}
		
		//double pushes
		while(doublePushes) {
			helpMask = doublePushes & -doublePushes;
			doublePushes -= helpMask;
			to = debruijnTable[(helpMask * debruijn) >>> 27] + 32;
			allMoves.push((to + 16) | (to << 6) | 262144); //1 << 18
		}
		
		//notLeft: -16843010
		//notRight: 2139062143
		const capturesLeft = [((pawnBb[0] & -16843010) >>> 9) | ((pawnBb[1] & -16843010) << 23), (pawnBb[1] & -16843010) >>> 9];
		const capturesRight = [((pawnBb[0] & 2139062143) >>> 7) | ((pawnBb[1] & 2139062143) << 25), (pawnBb[1] & 2139062143) >>> 7];
		const turnOffset = !board.turn * 6;
		
		let capturesLeftLow = capturesLeft[0] & enemy[0] & -256;
		let capturesLeftHigh = capturesLeft[1] & enemy[1];
		let capturesRightLow = capturesRight[0] & enemy[0] & -256;
		let capturesRightHigh = capturesRight[1] & enemy[1];
		let promCapturesLeft = capturesLeft[0] & enemy[0] & 255;
		let promCapturesRight = capturesRight[0] & enemy[0] & 255;
		
		let index;
		while(capturesLeftLow) {
			helpMask = capturesLeftLow & -capturesLeftLow;
			capturesLeftLow -= helpMask;
			to = debruijnTable[(helpMask * debruijn) >>> 27];
			index = 0;
			index |= ((board.piecesLow[turnOffset+1]&helpMask) >>> to);
			index |= ((board.piecesLow[turnOffset+2]&helpMask) >>> to)*2;
			index |= ((board.piecesLow[turnOffset+3]&helpMask) >>> to)*3;
			index |= ((board.piecesLow[turnOffset+4]&helpMask) >>> to)*4;
			allCaptures.push((to + 9) | (to << 6) | (index << 15) | 1048576); //4 << 18
		}
		while(capturesLeftHigh) {
			helpMask = capturesLeftHigh & -capturesLeftHigh;
			capturesLeftHigh -= helpMask;
			to = debruijnTable[(helpMask * debruijn) >>> 27] + 32;
			index = 0;
			index |= ((board.piecesHigh[turnOffset+1]&helpMask) >>> to);
			index |= ((board.piecesHigh[turnOffset+2]&helpMask) >>> to)*2;
			index |= ((board.piecesHigh[turnOffset+3]&helpMask) >>> to)*3;
			index |= ((board.piecesHigh[turnOffset+4]&helpMask) >>> to)*4;
			allCaptures.push((to + 9) | (to << 6) | (index << 15) | 1048576); //4 << 18
		}
		while(capturesRightLow) {
			helpMask = capturesRightLow & -capturesRightLow;
			capturesRightLow -= helpMask;
			to = debruijnTable[(helpMask * debruijn) >>> 27];
			index = 0;
			index |= ((board.piecesLow[turnOffset+1]&helpMask) >>> to);
			index |= ((board.piecesLow[turnOffset+2]&helpMask) >>> to)*2;
			index |= ((board.piecesLow[turnOffset+3]&helpMask) >>> to)*3;
			index |= ((board.piecesLow[turnOffset+4]&helpMask) >>> to)*4;
			allCaptures.push((to + 7) | (to << 6) | (index << 15) | 1048576); //4 << 18
		}
		while(capturesRightHigh) {
			helpMask = capturesRightHigh & -capturesRightHigh;
			capturesRightHigh -= helpMask;
			to = debruijnTable[(helpMask * debruijn) >>> 27] + 32;
			index = 0;
			index |= ((board.piecesHigh[turnOffset+1]&helpMask) >>> to);
			index |= ((board.piecesHigh[turnOffset+2]&helpMask) >>> to)*2;
			index |= ((board.piecesHigh[turnOffset+3]&helpMask) >>> to)*3;
			index |= ((board.piecesHigh[turnOffset+4]&helpMask) >>> to)*4;
			allCaptures.push((to + 7) | (to << 6) | (index << 15) | 1048576); //4 << 18
		}
		while(promCapturesLeft) {
			helpMask = promCapturesLeft & -promCapturesLeft;
			promCapturesLeft -= helpMask;
			to = debruijnTable[(helpMask * debruijn) >>> 27];
			index = 0;
			index |= ((board.piecesLow[turnOffset+1]&helpMask) >>> to);
			index |= ((board.piecesLow[turnOffset+2]&helpMask) >>> to)*2;
			index |= ((board.piecesLow[turnOffset+3]&helpMask) >>> to)*3;
			index |= ((board.piecesLow[turnOffset+4]&helpMask) >>> to)*4;
			promMove = (to + 9) | (to << 6) | (index << 15) | 3145728; //12 << 18
			allPromotions.push(promMove | (3 << 18));
			allPromotions.push(promMove | (2 << 18));
			allPromotions.push(promMove | (1 << 18));
			allPromotions.push(promMove);
		}
		while(promCapturesRight) {
			helpMask = promCapturesRight & -promCapturesRight;
			promCapturesRight -= helpMask;
			to = debruijnTable[(helpMask * debruijn) >>> 27];
			index = 0;
			index |= ((board.piecesLow[turnOffset+1]&helpMask) >>> to);
			index |= ((board.piecesLow[turnOffset+2]&helpMask) >>> to)*2;
			index |= ((board.piecesLow[turnOffset+3]&helpMask) >>> to)*3;
			index |= ((board.piecesLow[turnOffset+4]&helpMask) >>> to)*4;
			promMove = (to + 7) | (to << 6) | (index << 15) | 3145728; //12 << 18
			allPromotions.push(promMove | (3 << 18));
			allPromotions.push(promMove | (2 << 18));
			allPromotions.push(promMove | (1 << 18));
			allPromotions.push(promMove);
		}
		if(board.enPassantLow & capturesLeft[0]) {
			to = debruijnTable[(board.enPassantLow * debruijn) >>> 27];
			//captureExtra = 393216
			allCaptures.push((to + 9) | (to << 6) | 1310720); //5 << 18
		}
		if(board.enPassantLow & capturesRight[0]) {
			to = debruijnTable[(board.enPassantLow * debruijn) >>> 27];
			//captureExtra = 393216
			allCaptures.push((to + 7) | (to << 6) | 1310720); //5 << 18
		}
	}
	function genWhitePawnNonQuiets(pawnBb, enemy, friendly, board, allNonQuiets) {
		const emptyLow = ~(enemy[0] | friendly[0]);
		const emptyHigh = ~(enemy[1] | friendly[1]);
		//>>
		//16711680 are all the pawns on second rank
		const singlePushes = [((pawnBb[0] >>> 8) | (pawnBb[1] << 24)) & emptyLow, (pawnBb[1] >>> 8) & emptyHigh];
		let promotions = singlePushes[0] & 255;
		
		let helpMask;
		let to;
		
		let promMove;
		while(promotions) {
			helpMask = promotions & -promotions;
			promotions -= helpMask;
			to = debruijnTable[(helpMask * debruijn) >>> 27];
			promMove = (to + 8) | (to << 6) | 2097152; //8 << 18
			//0-3 << 20
			allNonQuiets.push(promMove | (3 << 18));
			allNonQuiets.push(promMove | (2 << 18));
			allNonQuiets.push(promMove | (1 << 18));
			allNonQuiets.push(promMove);
		}
		
		//notLeft: -16843010
		//notRight: 2139062143
		const capturesLeft = [((pawnBb[0] & -16843010) >>> 9) | ((pawnBb[1] & -16843010) << 23), (pawnBb[1] & -16843010) >>> 9];
		const capturesRight = [((pawnBb[0] & 2139062143) >>> 7) | ((pawnBb[1] & 2139062143) << 25), (pawnBb[1] & 2139062143) >>> 7];
		const turnOffset = !board.turn * 6;
		
		let capturesLeftLow = capturesLeft[0] & enemy[0] & -256;
		let capturesLeftHigh = capturesLeft[1] & enemy[1];
		let capturesRightLow = capturesRight[0] & enemy[0] & -256;
		let capturesRightHigh = capturesRight[1] & enemy[1];
		let promCapturesLeft = capturesLeft[0] & enemy[0] & 255;
		let promCapturesRight = capturesRight[0] & enemy[0] & 255;
		
		let index;
		while(capturesLeftLow) {
			helpMask = capturesLeftLow & -capturesLeftLow;
			capturesLeftLow -= helpMask;
			to = debruijnTable[(helpMask * debruijn) >>> 27];
			index = 0;
			index |= ((board.piecesLow[turnOffset+1]&helpMask) >>> to);
			index |= ((board.piecesLow[turnOffset+2]&helpMask) >>> to)*2;
			index |= ((board.piecesLow[turnOffset+3]&helpMask) >>> to)*3;
			index |= ((board.piecesLow[turnOffset+4]&helpMask) >>> to)*4;
			allNonQuiets.push((to + 9) | (to << 6) | (index << 15) | 1048576); //4 << 18
		}
		while(capturesLeftHigh) {
			helpMask = capturesLeftHigh & -capturesLeftHigh;
			capturesLeftHigh -= helpMask;
			to = debruijnTable[(helpMask * debruijn) >>> 27] + 32;
			index = 0;
			index |= ((board.piecesHigh[turnOffset+1]&helpMask) >>> to);
			index |= ((board.piecesHigh[turnOffset+2]&helpMask) >>> to)*2;
			index |= ((board.piecesHigh[turnOffset+3]&helpMask) >>> to)*3;
			index |= ((board.piecesHigh[turnOffset+4]&helpMask) >>> to)*4;
			allNonQuiets.push((to + 9) | (to << 6) | (index << 15) | 1048576); //4 << 18
		}
		while(capturesRightLow) {
			helpMask = capturesRightLow & -capturesRightLow;
			capturesRightLow -= helpMask;
			to = debruijnTable[(helpMask * debruijn) >>> 27];
			index = 0;
			index |= ((board.piecesLow[turnOffset+1]&helpMask) >>> to);
			index |= ((board.piecesLow[turnOffset+2]&helpMask) >>> to)*2;
			index |= ((board.piecesLow[turnOffset+3]&helpMask) >>> to)*3;
			index |= ((board.piecesLow[turnOffset+4]&helpMask) >>> to)*4;
			allNonQuiets.push((to + 7) | (to << 6) | (index << 15) | 1048576); //4 << 18
		}
		while(capturesRightHigh) {
			helpMask = capturesRightHigh & -capturesRightHigh;
			capturesRightHigh -= helpMask;
			to = debruijnTable[(helpMask * debruijn) >>> 27] + 32;
			index = 0;
			index |= ((board.piecesHigh[turnOffset+1]&helpMask) >>> to);
			index |= ((board.piecesHigh[turnOffset+2]&helpMask) >>> to)*2;
			index |= ((board.piecesHigh[turnOffset+3]&helpMask) >>> to)*3;
			index |= ((board.piecesHigh[turnOffset+4]&helpMask) >>> to)*4;
			allNonQuiets.push((to + 7) | (to << 6) | (index << 15) | 1048576); //4 << 18
		}
		while(promCapturesLeft) {
			helpMask = promCapturesLeft & -promCapturesLeft;
			promCapturesLeft -= helpMask;
			to = debruijnTable[(helpMask * debruijn) >>> 27];
			index = 0;
			index |= ((board.piecesLow[turnOffset+1]&helpMask) >>> to);
			index |= ((board.piecesLow[turnOffset+2]&helpMask) >>> to)*2;
			index |= ((board.piecesLow[turnOffset+3]&helpMask) >>> to)*3;
			index |= ((board.piecesLow[turnOffset+4]&helpMask) >>> to)*4;
			promMove = (to + 9) | (to << 6) | (index << 15) | 3145728; //12 << 18
			allNonQuiets.push(promMove | (3 << 18));
			allNonQuiets.push(promMove | (2 << 18));
			allNonQuiets.push(promMove | (1 << 18));
			allNonQuiets.push(promMove);
		}
		while(promCapturesRight) {
			helpMask = promCapturesRight & -promCapturesRight;
			promCapturesRight -= helpMask;
			to = debruijnTable[(helpMask * debruijn) >>> 27];
			index = 0;
			index |= ((board.piecesLow[turnOffset+1]&helpMask) >>> to);
			index |= ((board.piecesLow[turnOffset+2]&helpMask) >>> to)*2;
			index |= ((board.piecesLow[turnOffset+3]&helpMask) >>> to)*3;
			index |= ((board.piecesLow[turnOffset+4]&helpMask) >>> to)*4;
			promMove = (to + 7) | (to << 6) | (index << 15) | 3145728; //12 << 18
			allNonQuiets.push(promMove | (3 << 18));
			allNonQuiets.push(promMove | (2 << 18));
			allNonQuiets.push(promMove | (1 << 18));
			allNonQuiets.push(promMove);
		}
		if(board.enPassantLow & capturesLeft[0]) {
			to = debruijnTable[(board.enPassantLow * debruijn) >>> 27];
			//captureExtra = 393216
			allNonQuiets.push((to + 9) | (to << 6) | 1310720); //5 << 18
		}
		if(board.enPassantLow & capturesRight[0]) {
			to = debruijnTable[(board.enPassantLow * debruijn) >>> 27];
			//captureExtra = 393216
			allNonQuiets.push((to + 7) | (to << 6) | 1310720); //5 << 18
		}
	}
	
	function genBlackPawnMoves(pawnBb, enemy, friendly, board, allMoves, allCaptures, allPromotions) {
		const emptyLow = ~(enemy[0] | friendly[0]);
		const emptyHigh = ~(enemy[1] | friendly[1]);
		//>>
		//16711680 are all the pawns on second rank
		const singlePushes = [(pawnBb[0] << 8) & emptyLow, ((pawnBb[1] << 8) | (pawnBb[0] >>> 24)) & emptyHigh];
		let singlePushesLow = singlePushes[0];
		let singlePushesHigh = singlePushes[1] & 16777215;
		let promotions = singlePushes[1] & -16777216;
		
		//sixth rank = 16711680
		let doublePushes = ((singlePushesLow & 16711680) << 8) & emptyLow;
		
		//from | (piece << 12)
		//single pushes
		let helpMask;
		let to;
		while(singlePushesLow) {
			helpMask = singlePushesLow & -singlePushesLow;
			singlePushesLow -= helpMask;
			to = debruijnTable[(helpMask * debruijn) >>> 27];
			allMoves.push((to - 8) | (to << 6));
		}
		while(singlePushesHigh) {
			helpMask = singlePushesHigh & -singlePushesHigh;
			singlePushesHigh -= helpMask;
			to = debruijnTable[(helpMask * debruijn) >>> 27] + 32;
			allMoves.push((to - 8) | (to << 6));
		}
		
		let promMove;
		while(promotions) {
			helpMask = promotions & -promotions;
			promotions -= helpMask;
			to = debruijnTable[(helpMask * debruijn) >>> 27] + 32;
			promMove = (to - 8) | (to << 6) | 2097152; //8 << 18
			allPromotions.push(promMove | (3 << 18));
			allPromotions.push(promMove | (2 << 18));
			allPromotions.push(promMove | (1 << 18));
			allPromotions.push(promMove);
		}
		
		//double pushes
		while(doublePushes) {
			helpMask = doublePushes & -doublePushes;
			doublePushes -= helpMask;
			to = debruijnTable[(helpMask * debruijn) >>> 27];
			allMoves.push((to - 16) | (to << 6) | 262144); //1 << 18
		}
		
		//notLeft: -16843010
		//notRight: 2139062143
		const capturesLeft = [(pawnBb[0] & 2139062143) << 9, ((pawnBb[1] & 2139062143) << 9) | ((pawnBb[0] & 2139062143) >>> 23)];
		const capturesRight = [(pawnBb[0] & -16843010) << 7, ((pawnBb[1] & -16843010) << 7) | ((pawnBb[0] & -16843010) >>> 25)];
		const turnOffset = !board.turn * 6;
		
		let capturesLeftLow = capturesLeft[0] & enemy[0];
		let capturesLeftHigh = capturesLeft[1] & enemy[1] & 16777215;
		let capturesRightLow = capturesRight[0] & enemy[0];
		let capturesRightHigh = capturesRight[1] & enemy[1] & 16777215;
		let promCapturesLeft = capturesLeft[1] & enemy[1] & -16777216;
		let promCapturesRight = capturesRight[1] & enemy[1] & -16777216;
		
		let index;
		while(capturesLeftLow) {
			helpMask = capturesLeftLow & -capturesLeftLow;
			capturesLeftLow -= helpMask;
			to = debruijnTable[(helpMask * debruijn) >>> 27];
			index = 0;
			index |= ((board.piecesLow[turnOffset+1]&helpMask) >>> to);
			index |= ((board.piecesLow[turnOffset+2]&helpMask) >>> to)*2;
			index |= ((board.piecesLow[turnOffset+3]&helpMask) >>> to)*3;
			index |= ((board.piecesLow[turnOffset+4]&helpMask) >>> to)*4;
			allCaptures.push((to - 9) | (to << 6) | (index << 15) | 1048576); //4 << 18
		}
		while(capturesLeftHigh) {
			helpMask = capturesLeftHigh & -capturesLeftHigh;
			capturesLeftHigh -= helpMask;
			to = debruijnTable[(helpMask * debruijn) >>> 27] + 32;
			index = 0;
			index |= ((board.piecesHigh[turnOffset+1]&helpMask) >>> to);
			index |= ((board.piecesHigh[turnOffset+2]&helpMask) >>> to)*2;
			index |= ((board.piecesHigh[turnOffset+3]&helpMask) >>> to)*3;
			index |= ((board.piecesHigh[turnOffset+4]&helpMask) >>> to)*4;
			allCaptures.push((to - 9) | (to << 6) | (index << 15) | 1048576); //4 << 18
		}
		while(capturesRightLow) {
			helpMask = capturesRightLow & -capturesRightLow;
			capturesRightLow -= helpMask;
			to = debruijnTable[(helpMask * debruijn) >>> 27];
			index = 0;
			index |= ((board.piecesLow[turnOffset+1]&helpMask) >>> to);
			index |= ((board.piecesLow[turnOffset+2]&helpMask) >>> to)*2;
			index |= ((board.piecesLow[turnOffset+3]&helpMask) >>> to)*3;
			index |= ((board.piecesLow[turnOffset+4]&helpMask) >>> to)*4;
			allCaptures.push((to - 7) | (to << 6) | (index << 15) | 1048576); //4 << 18
		}
		while(capturesRightHigh) {
			helpMask = capturesRightHigh & -capturesRightHigh;
			capturesRightHigh -= helpMask;
			to = debruijnTable[(helpMask * debruijn) >>> 27] + 32;
			index = 0;
			index |= ((board.piecesHigh[turnOffset+1]&helpMask) >>> to);
			index |= ((board.piecesHigh[turnOffset+2]&helpMask) >>> to)*2;
			index |= ((board.piecesHigh[turnOffset+3]&helpMask) >>> to)*3;
			index |= ((board.piecesHigh[turnOffset+4]&helpMask) >>> to)*4;
			allCaptures.push((to - 7) | (to << 6) | (index << 15) | 1048576); //4 << 18
		}
		while(promCapturesLeft) {
			helpMask = promCapturesLeft & -promCapturesLeft;
			promCapturesLeft -= helpMask;
			to = debruijnTable[(helpMask * debruijn) >>> 27] + 32;
			index = 0;
			index |= ((board.piecesHigh[turnOffset+1]&helpMask) >>> to);
			index |= ((board.piecesHigh[turnOffset+2]&helpMask) >>> to)*2;
			index |= ((board.piecesHigh[turnOffset+3]&helpMask) >>> to)*3;
			index |= ((board.piecesHigh[turnOffset+4]&helpMask) >>> to)*4;
			promMove = (to - 9) | (to << 6) | (index << 15) | 3145728; //12 << 18
			allPromotions.push(promMove | (3 << 18));
			allPromotions.push(promMove | (2 << 18));
			allPromotions.push(promMove | (1 << 18));
			allPromotions.push(promMove);
		}
		while(promCapturesRight) {
			helpMask = promCapturesRight & -promCapturesRight;
			promCapturesRight -= helpMask;
			to = debruijnTable[(helpMask * debruijn) >>> 27] + 32;
			index = 0;
			index |= ((board.piecesHigh[turnOffset+1]&helpMask) >>> to);
			index |= ((board.piecesHigh[turnOffset+2]&helpMask) >>> to)*2;
			index |= ((board.piecesHigh[turnOffset+3]&helpMask) >>> to)*3;
			index |= ((board.piecesHigh[turnOffset+4]&helpMask) >>> to)*4;
			promMove = (to - 7) | (to << 6) | (index << 15) | 3145728; //12 << 18
			allPromotions.push(promMove | (3 << 18));
			allPromotions.push(promMove | (2 << 18));
			allPromotions.push(promMove | (1 << 18));
			allPromotions.push(promMove);
		}
		
		if(board.enPassantHigh & capturesLeft[1]) {
			to = debruijnTable[(board.enPassantHigh * debruijn) >>> 27] + 32;
			//captureExtra = 393216
			allCaptures.push((to - 9) | (to << 6) | 1310720); //5 << 18
		}
		if(board.enPassantHigh & capturesRight[1]) {
			to = debruijnTable[(board.enPassantHigh * debruijn) >>> 27] + 32;
			//captureExtra = 393216
			allCaptures.push((to - 7) | (to << 6) | 1310720); //5 << 18
		}
	}
	function genBlackPawnNonQuiets(pawnBb, enemy, friendly, board, allNonQuiets) {
		const emptyLow = ~(enemy[0] | friendly[0]);
		const emptyHigh = ~(enemy[1] | friendly[1]);
		//>>
		//16711680 are all the pawns on second rank
		const singlePushes = [(pawnBb[0] << 8) & emptyLow, ((pawnBb[1] << 8) | (pawnBb[0] >>> 24)) & emptyHigh];
		let promotions = singlePushes[1] & -16777216;
		
		//from | (piece << 12)
		let helpMask;
		let to;
		
		let promMove;
		while(promotions) {
			helpMask = promotions & -promotions;
			promotions -= helpMask;
			to = debruijnTable[(helpMask * debruijn) >>> 27] + 32;
			promMove = (to - 8) | (to << 6) | 2097152; //8 << 18
			allNonQuiets.push(promMove | (3 << 18));
			allNonQuiets.push(promMove | (2 << 18));
			allNonQuiets.push(promMove | (1 << 18));
			allNonQuiets.push(promMove);
		}
		
		
		//notLeft: -16843010
		//notRight: 2139062143
		const capturesLeft = [(pawnBb[0] & 2139062143) << 9, ((pawnBb[1] & 2139062143) << 9) | ((pawnBb[0] & 2139062143) >>> 23)];
		const capturesRight = [(pawnBb[0] & -16843010) << 7, ((pawnBb[1] & -16843010) << 7) | ((pawnBb[0] & -16843010) >>> 25)];
		const turnOffset = !board.turn * 6;
		
		let capturesLeftLow = capturesLeft[0] & enemy[0];
		let capturesLeftHigh = capturesLeft[1] & enemy[1] & 16777215;
		let capturesRightLow = capturesRight[0] & enemy[0];
		let capturesRightHigh = capturesRight[1] & enemy[1] & 16777215;
		let promCapturesLeft = capturesLeft[1] & enemy[1] & -16777216;
		let promCapturesRight = capturesRight[1] & enemy[1] & -16777216;
		
		let index;
		while(capturesLeftLow) {
			helpMask = capturesLeftLow & -capturesLeftLow;
			capturesLeftLow -= helpMask;
			to = debruijnTable[(helpMask * debruijn) >>> 27];
			index = 0;
			index |= ((board.piecesLow[turnOffset+1]&helpMask) >>> to);
			index |= ((board.piecesLow[turnOffset+2]&helpMask) >>> to)*2;
			index |= ((board.piecesLow[turnOffset+3]&helpMask) >>> to)*3;
			index |= ((board.piecesLow[turnOffset+4]&helpMask) >>> to)*4;
			allNonQuiets.push((to - 9) | (to << 6) | (index << 15) | 1048576); //4 << 18
		}
		while(capturesLeftHigh) {
			helpMask = capturesLeftHigh & -capturesLeftHigh;
			capturesLeftHigh -= helpMask;
			to = debruijnTable[(helpMask * debruijn) >>> 27] + 32;
			index = 0;
			index |= ((board.piecesHigh[turnOffset+1]&helpMask) >>> to);
			index |= ((board.piecesHigh[turnOffset+2]&helpMask) >>> to)*2;
			index |= ((board.piecesHigh[turnOffset+3]&helpMask) >>> to)*3;
			index |= ((board.piecesHigh[turnOffset+4]&helpMask) >>> to)*4;
			allNonQuiets.push((to - 9) | (to << 6) | (index << 15) | 1048576); //4 << 18
		}
		while(capturesRightLow) {
			helpMask = capturesRightLow & -capturesRightLow;
			capturesRightLow -= helpMask;
			to = debruijnTable[(helpMask * debruijn) >>> 27];
			index = 0;
			index |= ((board.piecesLow[turnOffset+1]&helpMask) >>> to);
			index |= ((board.piecesLow[turnOffset+2]&helpMask) >>> to)*2;
			index |= ((board.piecesLow[turnOffset+3]&helpMask) >>> to)*3;
			index |= ((board.piecesLow[turnOffset+4]&helpMask) >>> to)*4;
			allNonQuiets.push((to - 7) | (to << 6) | (index << 15) | 1048576); //4 << 18
		}
		while(capturesRightHigh) {
			helpMask = capturesRightHigh & -capturesRightHigh;
			capturesRightHigh -= helpMask;
			to = debruijnTable[(helpMask * debruijn) >>> 27] + 32;
			index = 0;
			index |= ((board.piecesHigh[turnOffset+1]&helpMask) >>> to);
			index |= ((board.piecesHigh[turnOffset+2]&helpMask) >>> to)*2;
			index |= ((board.piecesHigh[turnOffset+3]&helpMask) >>> to)*3;
			index |= ((board.piecesHigh[turnOffset+4]&helpMask) >>> to)*4;
			allNonQuiets.push((to - 7) | (to << 6) | (index << 15) | 1048576); //4 << 18
		}
		while(promCapturesLeft) {
			helpMask = promCapturesLeft & -promCapturesLeft;
			promCapturesLeft -= helpMask;
			to = debruijnTable[(helpMask * debruijn) >>> 27] + 32;
			index = 0;
			index |= ((board.piecesHigh[turnOffset+1]&helpMask) >>> to);
			index |= ((board.piecesHigh[turnOffset+2]&helpMask) >>> to)*2;
			index |= ((board.piecesHigh[turnOffset+3]&helpMask) >>> to)*3;
			index |= ((board.piecesHigh[turnOffset+4]&helpMask) >>> to)*4;
			promMove = (to - 9) | (to << 6) | (index << 15) | 3145728; //12 << 18
			allNonQuiets.push(promMove | (3 << 18));
			allNonQuiets.push(promMove | (2 << 18));
			allNonQuiets.push(promMove | (1 << 18));
			allNonQuiets.push(promMove);
		}
		while(promCapturesRight) {
			helpMask = promCapturesRight & -promCapturesRight;
			promCapturesRight -= helpMask;
			to = debruijnTable[(helpMask * debruijn) >>> 27] + 32;
			index = 0;
			index |= ((board.piecesHigh[turnOffset+1]&helpMask) >>> to);
			index |= ((board.piecesHigh[turnOffset+2]&helpMask) >>> to)*2;
			index |= ((board.piecesHigh[turnOffset+3]&helpMask) >>> to)*3;
			index |= ((board.piecesHigh[turnOffset+4]&helpMask) >>> to)*4;
			promMove = (to - 7) | (to << 6) | (index << 15) | 3145728; //12 << 18
			allNonQuiets.push(promMove | (3 << 18));
			allNonQuiets.push(promMove | (2 << 18));
			allNonQuiets.push(promMove | (1 << 18));
			allNonQuiets.push(promMove);
		}
		
		if(board.enPassantHigh & capturesLeft[1]) {
			to = debruijnTable[(board.enPassantHigh * debruijn) >>> 27] + 32;
			//captureExtra = 393216
			allNonQuiets.push((to - 9) | (to << 6) | 1310720); //5 << 18
		}
		if(board.enPassantHigh & capturesRight[1]) {
			to = debruijnTable[(board.enPassantHigh * debruijn) >>> 27] + 32;
			//captureExtra = 393216
			allNonQuiets.push((to - 7) | (to << 6) | 1310720); //5 << 18
		}
	}
	
	function genWhiteKingMoves(kingPos, enemy, friendly, board, allMoves) {
		const empty = [~(enemy[0] | friendly[0]), ~(enemy[1] | friendly[1])];
		
		const movesLow = kingLow[kingPos] & empty[0];
		const movesHigh = kingHigh[kingPos] & empty[1];
		
		moveBbToMoveList(kingPos, movesLow, movesHigh, 5, allMoves);
		if((board.castlingRights & 4) && (~empty[1] & 234881024) == 0) {
			if(!isInCheck(board)) {
				board.makeUnMakeSimple(24316, 0, 402653184);
				if(!isInCheck(board)) {
					//60, 58, 5, 0, 0, 0, 2, 4
					allMoves.push(810684);
				}
				board.makeUnMakeSimple(24316, 0, 402653184);
			}
		}
		if((board.castlingRights & 8) && (~empty[1] & 1610612736) == 0) {
			if(!isInCheck(board)) {
				board.makeUnMakeSimple(24444, 0, 805306368);
				if(!isInCheck(board)) {
					//60, 62, 5, 0, 0, 0, 3, 4
					allMoves.push(548796);
				}
				board.makeUnMakeSimple(24444, 0, 805306368);
			}
		}
	}
	function genWhiteKingCaptures(kingPos, enemy, board, allCaptures) {
		const capturesLow = kingLow[kingPos] & enemy[0];
		const capturesHigh = kingHigh[kingPos] & enemy[1];
		captureBbToMoveList(kingPos, capturesLow, capturesHigh, 5, board, allCaptures);
	}
	
	function genBlackKingMoves(kingPos, enemy, friendly, board, allMoves) {
		const empty = [~(enemy[0] | friendly[0]), ~(enemy[1] | friendly[1])];
		
		const movesLow = kingLow[kingPos] & empty[0];
		const movesHigh = kingHigh[kingPos] & empty[1];
		
		moveBbToMoveList(kingPos, movesLow, movesHigh, 5, allMoves);
		if((board.castlingRights & 1) && (~empty[0] & 14) == 0) {
			if(!isInCheck(board)) {
				board.makeUnMakeSimple(20676, 24, 0);
				if(!isInCheck(board)) {
					//4, 2, 11, 0, 0, 0, 0, 4
					allMoves.push(807044);
				}
				board.makeUnMakeSimple(20676, 24, 0);
			}
		}
		if((board.castlingRights & 2) && (~empty[0] & 96) == 0) {
			if(!isInCheck(board)) {
				board.makeUnMakeSimple(20804, 48, 0);
				if(!isInCheck(board)) {
					//4, 6, 11, 0, 0, 0, 1, 4
					allMoves.push(545156);
				}
				board.makeUnMakeSimple(20804, 48, 0);
			}
		}
	}
	function genBlackKingCaptures(kingPos, enemy, board, allCaptures) {
		const capturesLow = kingLow[kingPos] & enemy[0];
		const capturesHigh = kingHigh[kingPos] & enemy[1];
		captureBbToMoveList(kingPos, capturesLow, capturesHigh, 5, board, allCaptures);
	}
	
	function isInCheck(board) {
		const turnOffset = (board.turn ^ 1)*6;
		const kingIndex = board.turn*6 + 5;
		const kingPos = bbToPos(board.piecesLow[kingIndex], board.piecesHigh[kingIndex]);
		const obstaclesLow = board.occupiedLow[0] | board.occupiedLow[1];
		const obstaclesHigh = board.occupiedHigh[0] | board.occupiedHigh[1];
		
		//slider pieces
		const eQueensLow = board.piecesLow[turnOffset + 4];
		const eQueensHigh = board.piecesHigh[turnOffset + 4];
		const eRooksLow = board.piecesLow[turnOffset + 3] | eQueensLow;
		const eRooksHigh = board.piecesHigh[turnOffset + 3] | eQueensHigh;
		const eBishopsLow = board.piecesLow[turnOffset + 2] | eQueensLow;
		const eBishopsHigh = board.piecesHigh[turnOffset + 2] | eQueensHigh;
		
		//rook and queen
		const rookToLow = rookLow[kingPos];
		const rookToHigh = rookHigh[kingPos];
		let bb0 = genSliderCaptureMax(rookToLow[0], rookToHigh[0], obstaclesLow, obstaclesHigh);
		let bb1 = genSliderCaptureMin(rookToLow[1], rookToHigh[1], obstaclesLow, obstaclesHigh);
		let bb2 = genSliderCaptureMin(rookToLow[2], rookToHigh[2], obstaclesLow, obstaclesHigh);
		let bb3 = genSliderCaptureMax(rookToLow[3], rookToHigh[3], obstaclesLow, obstaclesHigh);
		let allTo = [bb0[0] | bb1[0] | bb2[0] | bb3[0], bb0[1] | bb1[1] | bb2[1] | bb3[1]];
		if((allTo[0] & eRooksLow) || (allTo[1] & eRooksHigh)) {
			return true;
		}
		
		//bishop and queen
		const bishopToLow = bishopLow[kingPos];
		const bishopToHigh = bishopHigh[kingPos];
		bb0 = genSliderCaptureMax(bishopToLow[0], bishopToHigh[0], obstaclesLow, obstaclesHigh);
		bb1 = genSliderCaptureMin(bishopToLow[1], bishopToHigh[1], obstaclesLow, obstaclesHigh);
		bb2 = genSliderCaptureMin(bishopToLow[2], bishopToHigh[2], obstaclesLow, obstaclesHigh);
		bb3 = genSliderCaptureMax(bishopToLow[3], bishopToHigh[3], obstaclesLow, obstaclesHigh);
		allTo = [bb0[0] | bb1[0] | bb2[0] | bb3[0], bb0[1] | bb1[1] | bb2[1] | bb3[1]];
		if((allTo[0] & eBishopsLow) || (allTo[1] & eBishopsHigh)) {
			return true;
		}
		
		//knight
		if((knightLow[kingPos] & board.piecesLow[turnOffset + 1]) || (knightHigh[kingPos] & board.piecesHigh[turnOffset + 1])) {
			return true;
		}
		
		//pawn
		if(board.turn == 0) {//white
			if((whitePawnLow[kingPos] & board.piecesLow[6]) || (whitePawnHigh[kingPos] & board.piecesHigh[6])) {
				return true;
			}
		}
		else {
			if((blackPawnLow[kingPos] & board.piecesLow[0]) || (blackPawnHigh[kingPos] & board.piecesHigh[0])) {
				return true;
			}
		}
		
		//king
		if((kingLow[kingPos] & board.piecesLow[turnOffset+5]) || (kingHigh[kingPos] & board.piecesHigh[turnOffset+5])) {
			return true;
		}
		
		return false;
	}
	
	function isLegalMove(move, board) {
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
		
		board.makeUnMakeSimple(move, fromToLow, fromToHigh, toLow, toHigh);
		if(isInCheck(board)) {
			board.makeUnMakeSimple(move, fromToLow, fromToHigh, toLow, toHigh);
			return false;
		}
		else {
			board.makeUnMakeSimple(move, fromToLow, fromToHigh, toLow, toHigh);
			return true;
		}
	}
	
	return {
		isCheck(board) {
			return isInCheck(board);
		},
		bbToPos(low, high) {
			return bbToPos(low, high);
		},
		perft(board, depth) {
			let moveCount = 0;
			let moves = this.genMoves(board);
			if(depth == 1) {
				return moves.length;
			}
			for(let i of moves) {
				board.make(i);
				moveCount += this.perft(board, depth-1);
				board.unmake(i);
			}
			return moveCount;
		},
		startPerft(board, depth) {
			console.time("perft");
			const nodes = this.perft(board, depth);
			console.timeEnd("perft");
			return nodes;
		},
		quiescePerft(board, depth) {
			qNodes++;
			if(depth == 0) {
				return;
			}
			const captures = this.genNonQuiets(board);
			const captures2 = this.genMoves(board);
			if(captures.length != captures2.length) {
				asdf
			}
			for(let i of captures) {
				board.make(i);
				this.quiescePerft(board, depth-1);
				board.unmake(i);
			}
		},
		findMoves: function(board, s) {
			let moves = [];
			let captures = [];
			let promotions = [];
		
			const turnOffset = board.turn*6;
			const from = posToBb(s);
			let enemy = [board.occupiedLow[!board.turn + 0], board.occupiedHigh[!board.turn + 0]];
			let friendly = [board.occupiedLow[board.turn + 0], board.occupiedHigh[board.turn + 0]];
			
			const rook = [from[0] & board.piecesLow[3+turnOffset], from[1] & board.piecesHigh[3+turnOffset]];
			genRookMoves(rook, enemy, friendly, 3, board, moves, captures);
			
			const bishop = [from[0] & board.piecesLow[2+turnOffset], from[1] & board.piecesHigh[2+turnOffset]];
			genBishopMoves(bishop, enemy, friendly, 2, board, moves, captures);
			
			const queen = [from[0] & board.piecesLow[4+turnOffset], from[1] & board.piecesHigh[4+turnOffset]];
			genQueenMoves(queen, enemy, friendly, 4, board, moves, captures);
			
			const knight = [from[0] & board.piecesLow[1+turnOffset], from[1] & board.piecesHigh[1+turnOffset]];
			genKnightMoves(knight, enemy, friendly, 1, board, moves, captures);
			
			if(board.turn == 0) {
				const whitePawn = [from[0] & board.piecesLow[0], from[1] & board.piecesHigh[0]];
				if(whitePawn[0] | whitePawn[1]) genWhitePawnMoves(whitePawn, enemy, friendly, board, moves, captures, promotions);
				
				const whiteKing = [from[0] & board.piecesLow[5], from[1] & board.piecesHigh[5]];
				if(whiteKing[0] | whiteKing[1]) {
					const kingPos = bbToPos(whiteKing[0], whiteKing[1])
					genWhiteKingMoves(kingPos, enemy, friendly, board, moves);
					genWhiteKingCaptures(kingPos, enemy, board, captures);
				}
			}
			else {
				const blackPawn = [from[0] & board.piecesLow[6], from[1] & board.piecesHigh[6]];
				if(blackPawn[0] | blackPawn[1]) genBlackPawnMoves(blackPawn, enemy, friendly, board, moves, captures, promotions);
				
				const blackKing = [from[0] & board.piecesLow[11], from[1] & board.piecesHigh[11]];
				if(blackKing[0] | blackKing[1]) {
					const kingPos = bbToPos(blackKing[0], blackKing[1]);
					genBlackKingMoves(kingPos, enemy, friendly, board, moves);
					genBlackKingCaptures(kingPos, enemy, board, moves);
				}
			}
			
			const allMoves = moves.concat(captures, promotions)
			for(let i = 0; i < allMoves.length; i++) {
				if(isLegalMove(allMoves[i], board) == false) {
					allMoves.splice(i, 1);
					i--;
				}
			}
			
			return allMoves;
		},
		genMoves: function(board) {
			let allMoves = [];
			let allCaptures = [];
			let allPromotions = [];
			
			if(board.turn == 0) {
				//white
				const enemy = [board.occupiedLow[1], board.occupiedHigh[1]];
				const friendly = [board.occupiedLow[0], board.occupiedHigh[0]];
				
				genQueenMoves([board.piecesLow[4], board.piecesHigh[4]], enemy, friendly, 4, board, allMoves, allCaptures);
				genRookMoves([board.piecesLow[3], board.piecesHigh[3]], enemy, friendly, 3, board, allMoves, allCaptures);
				genBishopMoves([board.piecesLow[2], board.piecesHigh[2]], enemy, friendly, 2, board, allMoves, allCaptures);
				genKnightMoves([board.piecesLow[1], board.piecesHigh[1]], enemy, friendly, 1, board, allMoves, allCaptures);
				genWhitePawnMoves([board.piecesLow[0], board.piecesHigh[0]], enemy, friendly, board, allMoves, allCaptures, allPromotions);
				const kingPos = bbToPos(board.piecesLow[5], board.piecesHigh[5]);
				genWhiteKingCaptures(kingPos, enemy, board, allCaptures);
				genWhiteKingMoves(kingPos, enemy, friendly, board, allMoves);
			}
			else {
				//black
				const enemy = [board.occupiedLow[0], board.occupiedHigh[0]];
				const friendly = [board.occupiedLow[1], board.occupiedHigh[1]];
				
				genQueenMoves([board.piecesLow[10], board.piecesHigh[10]], enemy, friendly, 4, board, allMoves, allCaptures);
				genRookMoves([board.piecesLow[9], board.piecesHigh[9]], enemy, friendly, 3, board, allMoves, allCaptures);
				genBishopMoves([board.piecesLow[8], board.piecesHigh[8]], enemy, friendly, 2, board, allMoves, allCaptures);
				genKnightMoves([board.piecesLow[7], board.piecesHigh[7]], enemy, friendly, 1, board, allMoves, allCaptures);
				genBlackPawnMoves([board.piecesLow[6], board.piecesHigh[6]], enemy, friendly, board, allMoves, allCaptures, allPromotions);
				const kingPos = bbToPos(board.piecesLow[11], board.piecesHigh[11]);
				genBlackKingCaptures(kingPos, enemy, board, allCaptures);
				genBlackKingMoves(kingPos, enemy, friendly, board, allMoves);
			}
			
			const moves = allPromotions.concat(allCaptures, allMoves);
			
			for(let i = 0; i < moves.length; i++) {
				if(isLegalMove(moves[i], board) == false) {
					moves.splice(i, 1);
					i--;
				}
			}
			return moves;
		},
		genPawnNonQuiets: function(board, enemy, friendly) {
			const allNonQuiets = [];
			if(board.turn == 0) {
				genWhitePawnNonQuiets([board.piecesLow[0], board.piecesHigh[0]], enemy, friendly, board, allNonQuiets);
			}
			else {
				genBlackPawnNonQuiets([board.piecesLow[6], board.piecesHigh[6]], enemy, friendly, board, allNonQuiets);
			}
			for(let i = 0; i < allNonQuiets.length; i++) {
				if(isLegalMove(allNonQuiets[i], board) == false) {
					allNonQuiets.splice(i, 1);
					i--;
				}
			}
			return allNonQuiets;
		},
		genKnightCaptures: function(board, enemy, friendly, index) {
			const allNonQuiets = [];
			genKnightCaptures([board.piecesLow[index], board.piecesHigh[index]], enemy, index, board, allNonQuiets);
			for(let i = 0; i < allNonQuiets.length; i++) {
				if(isLegalMove(allNonQuiets[i], board) == false) {
					allNonQuiets.splice(i, 1);
					i--;
				}
			}
			return allNonQuiets;
		},
		genBishopCaptures: function(board, enemy, friendly, index) {
			const allNonQuiets = [];
			genBishopCaptures([board.piecesLow[index], board.piecesHigh[index]], enemy, friendly, index, board, allNonQuiets);
			for(let i = 0; i < allNonQuiets.length; i++) {
				if(isLegalMove(allNonQuiets[i], board) == false) {
					allNonQuiets.splice(i, 1);
					i--;
				}
			}
			return allNonQuiets;
		},
		genRookCaptures: function(board, enemy, friendly, index) {
			const allNonQuiets = [];
			genRookCaptures([board.piecesLow[index], board.piecesHigh[index]], enemy, friendly, index, board, allNonQuiets);
			for(let i = 0; i < allNonQuiets.length; i++) {
				if(isLegalMove(allNonQuiets[i], board) == false) {
					allNonQuiets.splice(i, 1);
					i--;
				}
			}
			return allNonQuiets;
		},
		genQueenCaptures: function(board, enemy, friendly, index) {
			const allNonQuiets = [];
			genQueenCaptures([board.piecesLow[index], board.piecesHigh[index]], enemy, friendly, index, board, allNonQuiets);
			for(let i = 0; i < allNonQuiets.length; i++) {
				if(isLegalMove(allNonQuiets[i], board) == false) {
					allNonQuiets.splice(i, 1);
					i--;
				}
			}
			return allNonQuiets;
		},
		genKingCaptures: function(board, enemy, friendly) {
			const allNonQuiets = [];
			if(board.turn == 0) {
				const kingPos = bbToPos(board.piecesLow[5], board.piecesHigh[5]);
				genWhiteKingCaptures(kingPos, enemy, board, allNonQuiets);
			}
			else {
				const kingPos = bbToPos(board.piecesLow[11], board.piecesHigh[11]);
				genBlackKingCaptures(kingPos, enemy, board, allNonQuiets);
			}
			for(let i = 0; i < allNonQuiets.length; i++) {
				if(isLegalMove(allNonQuiets[i], board) == false) {
					allNonQuiets.splice(i, 1);
					i--;
				}
			}
			return allNonQuiets;
		},
		genNonQuiets: function(board) {
			const allNonQuiets = [];
			
			if(board.turn == 0) {
				//white
				const enemy = [board.occupiedLow[1], board.occupiedHigh[1]];
				const friendly = [board.occupiedLow[0], board.occupiedHigh[0]];
				
				genWhitePawnNonQuiets([board.piecesLow[0], board.piecesHigh[0]], enemy, friendly, board, allNonQuiets);
				genKnightCaptures([board.piecesLow[1], board.piecesHigh[1]], enemy, 1, board, allNonQuiets);
				genBishopCaptures([board.piecesLow[2], board.piecesHigh[2]], enemy, friendly, 2, board, allNonQuiets);
				genRookCaptures([board.piecesLow[3], board.piecesHigh[3]], enemy, friendly, 3, board, allNonQuiets);
				genQueenCaptures([board.piecesLow[4], board.piecesHigh[4]], enemy, friendly, 4, board, allNonQuiets);
				/*genQueenCaptures([board.piecesLow[4], board.piecesHigh[4]], enemy, friendly, 4, board, allCaptures);
				genRookCaptures([board.piecesLow[3], board.piecesHigh[3]], enemy, friendly, 3, board, allCaptures);
				genBishopCaptures([board.piecesLow[2], board.piecesHigh[2]], enemy, friendly, 2, board, allCaptures);
				genKnightCaptures([board.piecesLow[1], board.piecesHigh[1]], enemy, 1, board, allCaptures);
				genWhitePawnNonQuiets([board.piecesLow[0], board.piecesHigh[0]], enemy, friendly, board, allCaptures, allPromotions);*/
				const kingPos = bbToPos(board.piecesLow[5], board.piecesHigh[5]);
				genWhiteKingCaptures(kingPos, enemy, board, allNonQuiets);
			}
			else {
				//black
				const enemy = [board.occupiedLow[0], board.occupiedHigh[0]];
				const friendly = [board.occupiedLow[1], board.occupiedHigh[1]];
				
				genBlackPawnNonQuiets([board.piecesLow[6], board.piecesHigh[6]], enemy, friendly, board, allNonQuiets);
				genKnightCaptures([board.piecesLow[7], board.piecesHigh[7]], enemy, 1, board, allNonQuiets);
				genBishopCaptures([board.piecesLow[8], board.piecesHigh[8]], enemy, friendly, 2, board, allNonQuiets);
				genRookCaptures([board.piecesLow[9], board.piecesHigh[9]], enemy, friendly, 3, board, allNonQuiets);
				genQueenCaptures([board.piecesLow[10], board.piecesHigh[10]], enemy, friendly, 4, board, allNonQuiets);
				/*genQueenCaptures([board.piecesLow[10], board.piecesHigh[10]], enemy, friendly, 10, board, allCaptures);
				genRookCaptures([board.piecesLow[9], board.piecesHigh[9]], enemy, friendly, 9, board, allCaptures);
				genBishopCaptures([board.piecesLow[8], board.piecesHigh[8]], enemy, friendly, 8, board, allCaptures);
				genKnightCaptures([board.piecesLow[7], board.piecesHigh[7]], enemy, 7, board, allCaptures);
				genBlackPawnNonQuiets([board.piecesLow[6], board.piecesHigh[6]], enemy, friendly, board, allCaptures, allPromotions);*/
				const kingPos = bbToPos(board.piecesLow[11], board.piecesHigh[11]);
				genBlackKingCaptures(kingPos, enemy, board, allNonQuiets);
			}
			
			for(let i = 0; i < allNonQuiets.length; i++) {
				if(isLegalMove(allNonQuiets[i], board) == false) {
					allNonQuiets.splice(i, 1);
					i--;
				}
			}
			return allNonQuiets;
		}
	}
})();