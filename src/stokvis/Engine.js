let nodes = 0;
let qNodes = 0;
let cutoffs = 0;
let ttLookups = 0;
let ttLookupsExact = 0;
let hashCollisions = 0;
let repetitions = 0;

const transSize = (1 << 20)-1; //4 for laptop

//58273

let ttLow = new Int32Array(transSize);
let ttHigh = new Int32Array(transSize);
let ttDepth = new Uint8Array(transSize);
let ttValue = new Float32Array(transSize);
let ttFlag = new Uint8Array(transSize); //2: upperbound, 1: lowerbound, 0: exact
let ttBestMove = new Int32Array(transSize);
let ttAge = new Uint32Array(transSize);
let ttNodes = new Uint32Array(transSize);
let repTable = [];

//let historyHeuristic = new Uint32Array(4096);

/*
const ttBestLow = new Int32Array(transSize); //bestMove(0-21), low(22-31)
const ttValNodes = new Int32Array(transSize); //value(0-14), nodesSearched(15-31)
const ttHash = new Int32Array(transSize);
const ttDepthFlag = new Int32Array(transSize); //depth(0-5), flag(6-7)
*/

//new tt:
//low: all the bits left(limits tt size)
//high: 32 bits
//depth: 6 bits
//value: 15 bits (bit unsure about it)
//flag: 2 bits
//best move: 22 bits (maybe 12 or 16)
//depth + flag + bestMove = 30 bits (maybe 24 which needs a 24 bit ttHash (ttSize = (1 << 25)-1))
//optimal: depth + flag + bestMove + low, high
//most likely 3 32-bit arrays:
//bestMove + low(32 bits), value + nodesSearched(32 bits), depth + flag(8 bits), high(32 bits)

let killerTable = [];
for(let i = 0; i < 40; i++) {
	killerTable.push([]);
}

const Engine = (function() {
	let timeStop = false;
	//zobristLow, zobristHigh, depth, value, flag, best move
	//0			  1			   2	  3		 4	   5
	
	return {
		getPv: function(board) {
			const ttIndex = board.zobristLow & transSize;
			const ttEntry = ttBestMove[ttIndex];
			if(ttEntry != 0 && ttLow[ttIndex] == board.zobristLow && ttHigh[ttIndex] == board.zobristHigh) {
				board.make(ttEntry);
				console.log(ttDepth[ttIndex]);
			}
			else {
				console.log("no position found");
			}
		},
		getPercentageTtFilled: function() {
			let nEntries = 0;
			for(let i of ttLow) {
				nEntries += (i != 0);
			}
			return nEntries / transSize * 100;
		},
		staticExchangeEval: function(board, square) {
			let seeMove;
			const captures = MoveGen.genNonQuiets(board);
			for(let i of captures) {
				if((i & 4032) == square) {
					seeMove = i;
					break;
				}
			}
			if(!seeMove) {
				return 0;
			}

			board.make(seeMove);
			const value = Math.max(0, simpleValue[(seeMove & 983040) >>> 16] - this.staticExchangeEval(board, square));
			board.unmake(seeMove);
			return value;
		},
		quiescence: function(board, alpha, beta, color) {
			qNodes++;
			const initQNodes = qNodes;
			
			//repetition detection
			let reps = 0;
			const rtLength = repTable.length;
			for(let i = (rtLength + 2) % 4; i < rtLength; i += 4) {
				if(repTable[i] == board.zobristLow && repTable[i+1] == board.zobristHigh) {
					reps++;
				}
			}
			if(reps > 1) {
				return drawScore * color;
			}
			
			const alphaOrig = alpha;
			
			//pruning
			const standPat = board.evaluate() * color;
			if(standPat >= beta) {
				return beta;
			}
			alpha = Math.max(alpha, standPat);
			
			//transposition table lookup
			const ttIndex = board.zobristLow & transSize;
			if(ttLow[ttIndex] == board.zobristLow && ttHigh[ttIndex] == board.zobristHigh) {
				ttLookups++;
				const ttVal = ttValue[ttIndex];
				const ttFla = ttFlag[ttIndex];
				if(ttFla == 0) {
					ttLookupsExact++;
					return ttVal;
				}
				else if(ttFla == 1) {
					alpha = Math.max(alpha, ttVal);
				}
				else {
					beta = Math.min(beta, ttVal);
				}
				
				if(alpha >= beta) {
					return ttVal;
				}
			}
			
			//moves are already sorted a bit: promotions first, then pawn captures, knight captures, bishop captures, rook captures, queen captures
			//if the side to move is in check then all legal moves are generated and searched
			let moves;
			if(MoveGen.isCheck(board)) {
				moves = MoveGen.genMoves(board);
				if(moves.length == 0) {
					return -20000;
				}
			}
			else {
				moves = MoveGen.genNonQuiets(board);
			}

			//hash move first
			if(ttLow[ttIndex] == board.zobristLow && ttHigh[ttIndex] == board.zobristHigh) {
				const ttMoveIndex = moves.indexOf(ttBestMove[ttIndex]);
				if(ttMoveIndex != -1) {
					moves[ttMoveIndex] = moves[0];
					moves[0] = ttBestMove[ttIndex];
				}
			}

			//search
			for(let i of moves) {
				board.make(i);
				let score = -this.quiescence(board, -beta, -alpha, -color);
				
				//mate scores are updated by depth
				score += (score < -19000) - (score > 19000);
				board.unmake(i);
				
				alpha = Math.max(score, alpha);
				if(score >= beta) {
					//cutoffs++;
					break;
				}
			}
			
			if(qNodes - initQNodes > ttNodes[ttIndex]) {
				const flag = (alpha <= alphaOrig)*2 + (alpha >= beta);
				ttLow[ttIndex] = board.zobristLow;
				ttHigh[ttIndex] = board.zobristHigh;
				ttDepth[ttIndex] = 0;
				ttValue[ttIndex] = alpha;
				ttFlag[ttIndex] = flag;
				ttBestMove[ttIndex] = 0;
				ttAge[ttIndex] = board.nMovesMade;
				ttNodes[ttIndex] = qNodes - initQNodes;
			}
			
			return alpha;
		},
		negamax: function(board, depth, alpha, beta, color, endTime) {
			nodes++;
			const initNodes = nodes;
			const initQNodes = qNodes;
			
			if(Date.now() > endTime) {
				timeStop = true;
				return 0;
			}
			
			let reps = 0;
			const rtLength = repTable.length;
			for(let i = (rtLength + 2) % 4; i < rtLength; i += 4) {
				if(repTable[i] == board.zobristLow && repTable[i+1] == board.zobristHigh) {
					reps++;
				}
			}
			if(reps > 1) {
				return drawScore * color;
			}
			
			const alphaOrig = alpha;
			
			const ttIndex = board.zobristLow & transSize;
			let replace = true;//(depth >= ttDepth[ttIndex]) || (ttAge[ttIndex] + 10 < board.nMovesMade);
			
			if(ttLow[ttIndex] == board.zobristLow && ttHigh[ttIndex] == board.zobristHigh) {
				const ttDep = ttDepth[ttIndex];
				if(ttDep >= depth) {
					ttLookups++;
					const ttVal = ttValue[ttIndex];
					const ttFla = ttFlag[ttIndex];
					if(ttFla == 0) {
						ttLookupsExact++;
						return ttVal;
					}
					else if(ttFla == 1) {
						alpha = Math.max(alpha, ttVal);
					}
					else {
						beta = Math.min(beta, ttVal);
					}
					
					if(alpha >= beta) {
						return ttVal;
					}
					replace = false;
				}
			}
			
			if(depth < 1) {
				const value = this.quiescence(board, alpha, beta, color);
				
				if(replace && (qNodes - initQNodes) > ttNodes[ttIndex]) { //nodes - initNodes == 0
					const flag = (value <= alphaOrig)*2 + (value >= beta);
					/*if(value <= alphaOrig) {
						flag = 2; //upperbound
					}
					else if(value >= beta) {
						flag = 1; //lowerbound
					}
					else {
						flag = 0;
					}*/
					ttLow[ttIndex] = board.zobristLow;
					ttHigh[ttIndex] = board.zobristHigh;
					ttDepth[ttIndex] = 0;
					ttValue[ttIndex] = value;
					ttFlag[ttIndex] = flag;
					ttBestMove[ttIndex] = 0;
					ttAge[ttIndex] = board.nMovesMade;
					ttNodes[ttIndex] = qNodes - initQNodes;
				}
			
				return value;
			}
			
			let moves = MoveGen.genMoves(board);
			if(moves.length == 0) {
				if(MoveGen.isCheck(board)) {
					return -20000;
				}
				return drawScore * color;
			}
			
			
			if(ttLow[ttIndex] == board.zobristLow && ttHigh[ttIndex] == board.zobristHigh && ttBestMove[ttIndex] != 0) {
				const ttMoveIndex = moves.indexOf(ttBestMove[ttIndex]);
				moves[ttMoveIndex] = moves[0];
				moves[0] = ttBestMove[ttIndex];
			}
			
			let bestValue = -Infinity;
			let bestMove = 0;
			let value;
			for(let i of moves) {
				board.make(i);

				value = -this.negamax(board, depth-1, -beta, -alpha, -color, endTime);
				value += (value < -19000) - (value > 19000);

				if(value > bestValue) {
					bestValue = value;
					bestMove = i;
				}
				alpha = Math.max(alpha, bestValue);

				board.unmake(i);
				if(alpha >= beta) {
					break;
				}
			}
			
			const nodesSearched = (qNodes - initQNodes) + (nodes - initNodes);
			if(replace && !timeStop && nodesSearched > ttNodes[ttIndex]) {
				const flag = (bestValue <= alphaOrig)*2 + (bestValue >= beta);
				ttLow[ttIndex] = board.zobristLow;
				ttHigh[ttIndex] = board.zobristHigh;
				ttDepth[ttIndex] = depth;
				ttValue[ttIndex] = bestValue;
				ttFlag[ttIndex] = flag;
				ttBestMove[ttIndex] = bestMove;
				ttAge[ttIndex] = board.nMovesMade;
				ttNodes[ttIndex] = nodesSearched;
			}
			
			return bestValue;
		},
		startNegamax: function(board, depth, color, maxTime) {
			const endTime = new Date().getTime() + maxTime;
			
			console.time("negamax");
			let moves = MoveGen.genMoves(board);
			for(let i = 0; i < moves.length; i++) {
				moves[i] = [moves[i], 0];
			}
			
			hashCollisions = 0;
			ttLookups = 0;
			nodes = 0;
			qNodes = 0;
			
			let value;
			timeStop = false;
			for(let d = 1; d <= depth; d++) {
				let alpha = -Infinity;
				for(let i of moves) {
					board.make(i[0]);
					value = -this.negamax(board, d-1, -Infinity, -alpha, -color, endTime);
					i[1] = value;
					alpha = Math.max(alpha, value);
					board.unmake(i[0]);
				}
				
				if(!timeStop) {
					moves.sort(function(a, b) {return b[1] - a[1]});
					console.log("score " + Math.round(moves[0][1]) + " at depth " + d);
					
					const ttIndex = board.zobristLow & transSize;
					ttLow[ttIndex] = board.zobristLow;
					ttHigh[ttIndex] = board.zobristHigh;
					ttDepth[ttIndex] = d;
					ttValue[ttIndex] = moves[0][1];
					ttFlag[ttIndex] = 0;
					ttBestMove[ttIndex] = moves[0][0];
					ttAge[ttIndex] = board.nMovesMade;
				}
				const nextTime = new Date().getTime();
				if(nextTime > endTime) {
					break;
				}
			}
			console.timeEnd("negamax");
			//console.table(moves);
			return moves[0][0];
		},
		quiescenceStaged: function(board, alpha, beta, color) {
			const ttIndex = board.zobristLow & transSize;
			if(ttLow[ttIndex] == board.zobristLow && ttHigh[ttIndex] == board.zobristHigh && (ttBestMove[ttIndex] >>> 29) == 1) {
				const ttMove = ttBestMove[ttIndex];
				board.make(ttMove);
				let score = -this.quiescence(board, -beta, -alpha, -color);
				
				//mate scores are updated by depth
				score += (score < -19000);
				score -= (score > 19000);
				board.unmake(ttMove);
				
				alpha = Math.max(score, alpha);
				if(score >= beta) {
					return score;
				}
			}
			
			const enemy = [board.occupiedLow[board.turn ^ 1], board.occupiedHigh[board.turn ^ 1]];
			const friendly = [board.occupiedLow[board.turn], board.occupiedHigh[board.turn]];
			const turnOffset = board.turn*6;
			
			let nonQuiets;
			let score;
			let isLegalMove = false;
			
			//cutoffs: 7566
			//pawn: 2320
			//knight: 1298
			//bishop: 1171
			//rooks: 821
			//queens: 1230
			//king: 726
			
			//pawns
			nonQuiets = MoveGen.genPawnNonQuiets(board, enemy, friendly);
			for(let i of nonQuiets) {
				isLegalMove = true;
				board.make(i);
				score = -this.quiescence(board, -beta, -alpha, -color);
				
				//mate scores are updated by depth
				score += (score < -19000);
				score -= (score > 19000);
				board.unmake(i);
				
				alpha = Math.max(score, alpha);
				if(score >= beta) {
					return score;
				}
			}
			
			//knights
			nonQuiets = MoveGen.genKnightCaptures(board, enemy, friendly, 1 + turnOffset);
			for(let i of nonQuiets) {
				isLegalMove = true;
				board.make(i);
				score = -this.quiescence(board, -beta, -alpha, -color);
				
				//mate scores are updated by depth
				score += (score < -19000);
				score -= (score > 19000);
				board.unmake(i);
				
				alpha = Math.max(score, alpha);
				if(score >= beta) {
					return score;
				}
			}
			
			//bishops
			nonQuiets = MoveGen.genBishopCaptures(board, enemy, friendly, 2 + turnOffset);
			for(let i of nonQuiets) {
				isLegalMove = true;
				board.make(i);
				score = -this.quiescence(board, -beta, -alpha, -color);
				
				//mate scores are updated by depth
				score += (score < -19000);
				score -= (score > 19000);
				board.unmake(i);
				
				alpha = Math.max(score, alpha);
				if(score >= beta) {
					return score;
				}
			}
			
			//rooks
			nonQuiets = MoveGen.genRookCaptures(board, enemy, friendly, 3 + turnOffset);
			for(let i of nonQuiets) {
				isLegalMove = true;
				board.make(i);
				score = -this.quiescence(board, -beta, -alpha, -color);
				
				//mate scores are updated by depth
				score += (score < -19000);
				score -= (score > 19000);
				board.unmake(i);
				
				alpha = Math.max(score, alpha);
				if(score >= beta) {
					return score;
				}
			}
			
			//queens
			nonQuiets = MoveGen.genQueenCaptures(board, enemy, friendly, 4 + turnOffset);
			for(let i of nonQuiets) {
				isLegalMove = true;
				board.make(i);
				score = -this.quiescence(board, -beta, -alpha, -color);
				
				//mate scores are updated by depth
				score += (score < -19000);
				score -= (score > 19000);
				board.unmake(i);
				
				alpha = Math.max(score, alpha);
				if(score >= beta) {
					return score;
				}
			}
			
			//king
			nonQuiets = MoveGen.genKingCaptures(board, enemy, friendly);
			for(let i of nonQuiets) {
				isLegalMove = true;
				board.make(i);
				score = -this.quiescence(board, -beta, -alpha, -color);
				
				//mate scores are updated by depth
				score += (score < -19000);
				score -= (score > 19000);
				board.unmake(i);
				
				alpha = Math.max(score, alpha);
				if(score >= beta) {
					return score;
				}
			}
			
			
			if(!isLegalMove) {
				const moves = MoveGen.genMoves(board);
				if(moves.length == 0) {
					if(MoveGen.isCheck(board)) {
						return -20000;
					}
					else {
						return drawScore * color;
					}
				}
			}
			return alpha;
		},
		mtdf: function(board, firstGuess, color, depth, endTime) {
			let guess = firstGuess;
			let upperBound = Infinity;
			let lowerBound = -Infinity;
			let beta;
			while(lowerBound < upperBound) {
				if(guess == lowerBound) {
					beta = guess + 1;
				}
				else {
					beta = guess;
				}
				guess = this.negamax(board, depth, beta - 1, beta, color, endTime);
				if(guess < beta) {
					upperBound = guess;
				}
				else {
					lowerBound = guess;
				}
			}
			return guess;
		},
		iterativeMtdf: function(board, depth, color, maxTime) {
			const endTime = Date.now() + maxTime;
			timeStop = false;
			
			console.time("mtdf");
			let prevFirstGuess = 0;
			let firstGuess = 0;
			for(let d = 1; d <= depth; d++) {
				let value = this.mtdf(board, prevFirstGuess, color, d, endTime);
				if(!timeStop) {
					prevFirstGuess = firstGuess;
					firstGuess = value;
					console.log("score " + firstGuess + " at depth " + d);
				}
			}
			console.timeEnd("mtdf");
			return firstGuess;
		}
	}
})();


function count(s, e) {
	console.time("counting");
	let nChars = 0;
	let txt = "";
	for(let i = s; i <= e; i++) {
		nChars += i.toString().length + 1;
		if(nChars >= 2000) {
			txt += "\n \n";
			nChars = i.toString().length + 1;
		}
		txt += i + " ";
	}
	console.timeEnd("counting");
	return txt;
}