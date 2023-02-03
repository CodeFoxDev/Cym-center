const canvas = document.getElementById("canvas");
let width = canvas.width = window.innerWidth;
let height = canvas.height = window.innerHeight;

const ctx = canvas.getContext("2d");


const cBoard = new Board("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"); //default starting position
//const cBoard = new Board("5r2/p2b1rkp/1bB2N2/1P3pN1/1q3K2/6QP/3n1P2/6R1 w - - 0 1")
//const cBoard = new Board("r1bqkb1r/pp1p1ppp/2n2n2/4p3/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 6"); //popular start with sicilian
//const cBoard = new Board("r2qkb1r/pp3p1p/2n1bp2/2P1p3/3pP3/2N2N2/PPP2PPP/R2QKB1R w KQkq - 0 9");
//const cBoard = new Board("r1bqkb1r/1p1n1p2/p2p1n1p/4p1p1/3pP3/3B1NB1/PPP1QPPP/1N1R1RK1 w kq - 0 12"); //came to a depth of 2
//const cBoard = new Board("K1k1B3/8/8/8/8/8/7N/8 w - - 0 1"); //long bishop and knight mate possible
//const cBoard = new Board("8/7k/4p3/2p1P2p/2P1P2P/8/8/7K w - - 0 1"); //endgame puzzle
//const cBoard = new Board("r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10");

//engines defeated:
//stockfish level 6
//





//const cBoard = new Board("r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10");
cBoard.init();


let mouseSquare = 0;
let mousePressed = false;
let cMoves = [];
let cMovesTo = [];

let SquareSize = 0;
let OffsetX = 0;
let OffsetY = 0;

function loop() {
	ctx.fillStyle = "black";
	ctx.fillRect(0, 0, width, height);
	
	renderBoard(SquareSize, OffsetX, OffsetY, cMovesTo, cBoard);
	
	
	requestAnimationFrame(loop);
}

window.onload = function() {
	setBoardSize();
	loop();
}

document.onmousemove = function(e) {
	let mFile = Math.floor((e.clientX - OffsetX)/SquareSize);
	let mRank = Math.floor((e.clientY - OffsetY)/SquareSize);
	mouseSquare = mFile + mRank*8;
}

document.onmousedown = mouseDown;
//document.ontouchstart = mouseDown;
window.addEventListener("touchstart", function(event) {
	const e = event.targetTouches[0];
	let mFile = Math.floor((e.clientX - OffsetX)/SquareSize);
	let mRank = Math.floor((e.clientY - OffsetY)/SquareSize);
	mouseSquare = mFile + mRank*8;
	mouseDown();
});

function mouseDown() {
	cMoves = MoveGen.findMoves(cBoard, mouseSquare);
	for(let i of cMoves) {
		cMovesTo.push((i & 4032) >> 6);
	}
	mousePressed = true;
}

document.onmouseup = mouseUp;
window.addEventListener("touchend", function(event) {
	const e = event.changedTouches[0];
	let mFile = Math.floor((e.clientX - OffsetX)/SquareSize);
	let mRank = Math.floor((e.clientY - OffsetY)/SquareSize);
	mouseSquare = mFile + mRank*8;
	mouseUp();
});

function mouseUp() {
	let validMoves = [];
	for(let i = 0; i < cMovesTo.length; i++) {
		if(cMovesTo[i] == mouseSquare) {
			validMoves.push(cMoves[i]);
		}
	}
	if(validMoves.length == 1) {
		cBoard.make(validMoves[0]);
	}
	else if(validMoves.length > 1) {
		cBoard.make(validMoves[prompt("3: paard\n2: loper\n1: toren\n0: koningin")]);
	}
	
	cMoves = [];
	cMovesTo = [];
	mousePressed = false;
}


document.onkeypress = function(e) {
	if(e.key == "b") {
		cBoard.unmake(cBoard.movesMade[cBoard.nMovesMade-1]);
	}
	if(e.key == "e") {
		const bestMove = Engine.startNegamax(cBoard, 40, -(cBoard.turn*2 - 1), 100);
		cBoard.make(bestMove);
		console.log(cBoard.mgEval, cBoard.egEval, cBoard.phase);
	}
	if(e.key == "f") {
		const bestMove = Engine.startNegamax(cBoard, 40, -(cBoard.turn*2 - 1), 10000);
		cBoard.make(bestMove);
		console.log(cBoard.mgEval, cBoard.egEval, cBoard.phase);
	}
}

window.onresize = setBoardSize;
function setBoardSize() {
	width = canvas.width = window.innerWidth;
	height = canvas.height = window.innerHeight;
	
	if(height < width) {
		SquareSize = height/9;
		OffsetY = height/18;
		OffsetX = width/2 - SquareSize*4;
	}
	else {
		SquareSize = width/9;
		OffsetY = height/2 - SquareSize*4;
		OffsetX = width/18;
	}
}










