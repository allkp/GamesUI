package com.example.ttt.service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.example.ttt.model.TttModel;
import com.example.ttt.model.TttModel.Cell;

@Service
public class TttService {

    private final Map<String, TttModel> games = new ConcurrentHashMap<>();
    
    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public TttModel createGame() {
        TttModel t = new TttModel();
        games.put(t.getId(), t);
        return t;
    }

    public TttModel getGame(String id) {
        return games.get(id);
    }

    public TttModel makeMove(String id, int pos) {
        TttModel t = games.get(id);

        if(t == null) return null;
        if(t.getWinner() != null) return t;
        if(pos < 0 || pos > 8) return t;

        if(t.getBoard()[pos] != Cell.EMPTY) return t;

        t.getBoard()[pos] = t.getTurn();

        String w = checkWinner(t.getBoard());

        if(w != null) {
            t.setWinner(w);
        } else {
            boolean draw = true;
            for(Cell c : t.getBoard()) if(c == Cell.EMPTY) { draw = false; break; };
            if(draw) t.setWinner("DRAW");
            else t.setTurn(t.getTurn() == Cell.X ? Cell.O : Cell.X);
        }
        
        // Broadcast the updated game state to all subscribers
        messagingTemplate.convertAndSend("/topic/game/" + id, t);
        
        return t;
    }

    private String checkWinner(Cell[] b) {
        int[][] lines = {
                {0,1,2},{3,4,5},{6,7,8},
                {0,3,6},{1,4,7},{2,5,8},
                {0,4,8},{2,4,6}
        };

        for(int[] L : lines) {
            if(b[L[0]] != Cell.EMPTY && b[L[0]] == b[L[1]] && b[L[1]] == b[L[2]]) {
                return b[L[0]] == Cell.X ? "X" : "O";
            }
        }
        return null;
    }
}