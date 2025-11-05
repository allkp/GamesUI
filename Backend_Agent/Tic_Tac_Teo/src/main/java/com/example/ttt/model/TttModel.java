package com.example.ttt.model;

import java.util.UUID;

public class TttModel {

	public enum Cell {
		EMPTY, X, O
	};

	private final String id;

	private Cell[] board = new Cell[9];

	private Cell turn = Cell.X;

	private int playersConnected = 0;
	
	private String winner = null;

	public TttModel() {
		this.id = UUID.randomUUID().toString();
		for (int i = 0; i < 9; i++)
			board[i] = Cell.EMPTY;
	}
	
	public TttModel(String id, String winner) {
	    this.id = id;
	    this.winner = winner;
	}


	// getters/setters
	public String getId() {
		return id;
	}

	public Cell[] getBoard() {
		return board;
	}

	public Cell getTurn() {
		return turn;
	}

	public void setTurn(Cell t) {
		this.turn = t;
	}

	public String getWinner() {
		return winner;
	}

	public void setWinner(String w) {
		this.winner = w;
	}
	
	public int getPlayersConnected() { return playersConnected; }
	public void setPlayersConnected(int c) { this.playersConnected = c; }
	

}
