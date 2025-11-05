package com.example.ttt.websocket;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;

import com.example.ttt.model.TttModel;
import com.example.ttt.service.TttService;

@Component
public class WebSocketEventListener {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private TttService service; // access the same service that holds your games map

    @EventListener
    public void handleSessionSubscribeEvent(SessionSubscribeEvent event) {
        String destination = (String) event.getMessage().getHeaders().get("simpDestination");
        if (destination != null && destination.startsWith("/topic/game/")) {
            String gameId = destination.substring("/topic/game/".length());
            TttModel g = service.getGame(gameId);
            if (g != null) {
            	
            	// ✅ Restrict max 2 players
            	if(g.getPlayersConnected() >= 2) {
            		System.out.println("🚫 Third player tried to join game " + gameId);
            		// Inform only this new subscriber that room is full
            		messagingTemplate.convertAndSendToUser(
            				event.getUser() != null ? event.getUser().getName() : "anonymous",
            						"/queue/errors",
            						"Room is full for game: " + gameId
            				);
            		return;
            	}
            	
                g.setPlayersConnected(g.getPlayersConnected() + 1);
                messagingTemplate.convertAndSend("/topic/game/" + gameId, g);
                System.out.println("✅ Player joined game " + gameId + 
                                   ", total players: " + g.getPlayersConnected());
            }
        }
    }
}
