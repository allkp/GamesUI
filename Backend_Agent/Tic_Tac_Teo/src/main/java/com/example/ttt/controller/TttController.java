package com.example.ttt.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.ttt.model.ErrorResponse;
import com.example.ttt.model.TttModel;
import com.example.ttt.service.TttService;

@RestController
@RequestMapping("/api/games")
public class TttController {

	@Autowired
	private TttService service;

	@PostMapping
	public ResponseEntity<TttModel> createGame() {
		return ResponseEntity.ok(service.createGame());
	}

	@PostMapping("/{id}/move") // ✅ FIXED: changed from GetMapping to PostMapping
	public ResponseEntity<TttModel> move(@PathVariable String id, @RequestBody MoveRequest req) {
		TttModel t = service.makeMove(id, req.getPos());
		if (t == null)
			return ResponseEntity.notFound().build();
		return ResponseEntity.ok(t);
	}

	@GetMapping("/{id}")
	public ResponseEntity<?> getGame(@PathVariable String id) {
	    TttModel t = service.getGame(id);
	    if (t == null)
	        return ResponseEntity.status(404)
	                .body(new ErrorResponse("error", "Game not found"));
	    return ResponseEntity.ok(t);
	}

	public static class MoveRequest {
		private int pos;

		public int getPos() {
			return pos;
		}

		public void setPos(int p) {
			pos = p;
		}
	}

}
