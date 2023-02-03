function renderBoard(squareSize, offsetX, offsetY, moves, board) {
	for(let i = 0; i < 64; i++) {
		const x = (i % 8)*squareSize + offsetX;
		const y = (i >> 3)*squareSize + offsetY;
		if((i % 8 + (i >> 3)) % 2 == 1) {
			ctx.fillStyle = "#769656";
		}
		else {
			ctx.fillStyle = "#eeeed2";
		}
		ctx.fillRect(x, y, squareSize, squareSize);
		
		/*let squareBb = [];
		if(i < 32) {
			squareBb = [1 << i, 0];
		}
		else {
			squareBb = [0, 1 << i];
		}
		if((squareBb[0] & board.occupiedLow[0]) || (squareBb[1] & board.occupiedHigh[0])) {
			ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
			ctx.fillRect(x + squareSize*0.1, y + squareSize*0.1, squareSize*0.8, squareSize*0.8);
		}*/
	}
	for(let i of moves) {
		const f = i % 8;
		const r = i >> 3;
		ctx.fillStyle = "rgba(100, 100, 100, 0.3)";
		ctx.beginPath();
		ctx.arc(offsetX + squareSize*(f+0.5), offsetY + squareSize*(r+0.5), squareSize/2.3, 0, Math.PI*2);
		ctx.fill();
	}
	
	for(let i = 0; i < 6; i++) {
		const typeWhite = Pieces.typeToFileName(i);
		const typeBlack = Pieces.typeToFileName(i + 6);
		
		const bbWhite = [board.piecesLow[i], board.piecesHigh[i]];
		const bbBlack = [board.piecesLow[i+6], board.piecesHigh[i+6]];
		for(let s = 0; s < 32; s++) {
			const mask = 1 << s;
			const x = (s % 8)*squareSize + offsetX;
			const y = (s >> 3)*squareSize + offsetY;
			if(bbWhite[0] & mask) {
				ctx.drawImage(document.getElementById(typeWhite), x, y, squareSize, squareSize);
			}
			if(bbWhite[1] & mask) {
				ctx.drawImage(document.getElementById(typeWhite), x, y + squareSize*4, squareSize, squareSize);
			}
			if(bbBlack[0] & mask) {
				ctx.drawImage(document.getElementById(typeBlack), x, y, squareSize, squareSize);
			}
			if(bbBlack[1] & mask) {
				ctx.drawImage(document.getElementById(typeBlack), x, y + squareSize*4, squareSize, squareSize);
			}
		}
		
		//ctx.drawImage(document.getElementById(element), x, y, squareSize, squareSize);
	}
	
	
	let engineScore = board.evaluate() * (1 - board.turn*2);
	let engineDepth = 1;
	const ttIndex = board.zobristLow & transSize;
	if(ttLow[ttIndex] == board.zobristLow && ttHigh[ttIndex] == board.zobristHigh) {
		engineScore = ttValue[ttIndex];
		engineDepth = ttDepth[ttIndex];
	}
	//ctx.font = squareSize/2 + "px arial";
	//ctx.fillStyle = "white";
	//ctx.fillText(Math.round(engineScore), offsetX + squareSize*8 + 20, offsetY + squareSize);
	//ctx.fillText(engineDepth, offsetX + squareSize*8 + 20, offsetY + squareSize*2);
	//ctx.fillText(ttFlag[ttIndex], offsetX + squareSize*8 + 20, offsetY + squareSize*3);
	//\frac{500}{1+1.002^{-x}} good function maybe
}

function renderText(board) {
	let textLow = "";
	let textHigh = "";
	
	const chars = ["P", "N", "B", "R", "Q", "K", "p", "n", "b", "r", "q", "k"];
	for(let sq = 0; sq < 32; sq++) {
		let charLow = " ";
		let charHigh = " ";
		
		const mask = 1 << sq;
		for(let p = 0; p < 12; p++) {
			if(board.piecesLow[p] & mask) {
				charLow = chars[p];
			}
			if(board.piecesHigh[p] & mask) {
				charHigh = chars[p];
			}
		}
		
		textLow += charLow + " ";
		textHigh += charHigh + " ";
		if(sq % 8 == 7) {
			textLow += "\n";
			textHigh += "\n";
		}
	}
	
	console.log(textLow + textHigh);
}





