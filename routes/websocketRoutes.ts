// routes/websocketRoutes.ts
import { Router } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { verify } from "https://deno.land/x/djwt@v3.0.1/mod.ts";
import { key } from "../controllers/authController.ts";
import { leagueChatRepository } from "../models/leagueChat.ts";
import { privateLeagueRepository } from "../models/privateLeague.ts";

const router = new Router();
const activeClients = new Set<WebSocket>();
const clientUserMap = new Map<WebSocket, { userId: number, username: string }>();

// Pour les chats de ligue
const leagueClients = new Map<number, Set<WebSocket>>();

function safelySendMessage(socket: WebSocket, message: string) {
  try {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(message);
      return true;
    } else {
      console.log(`Socket not ready (state: ${socket.readyState}). Message not sent.`);
      return false;
    }
  } catch (err) {
    console.error("Error sending message:", err);
    return false;
  }
}

// Chat global
router.get("/ws", async (ctx) => {
  console.log("WebSocket connection request received");

  const token = await ctx.cookies.get("token");
  console.log("Token received:", token);

  if (!token) {
    console.log("No token found. Rejecting WebSocket connection.");
    ctx.response.status = 401;
    ctx.response.body = { message: "Unauthorized" };
    return;
  }

  try {
    const payload = await verify(token, key);
    const username = payload.sub;
    const userId = payload.id;
    console.log("User authenticated:", username);

    if (!ctx.isUpgradable) {
      console.log("Connection is not upgradable to WebSocket");
      ctx.response.status = 400;
      ctx.response.body = { message: "Cannot upgrade to WebSocket" };
      return;
    }

    const socket = await ctx.upgrade();
    console.log(`WebSocket upgraded for user ${username}`);
    
    activeClients.add(socket);
    clientUserMap.set(socket, { userId, username });
    
    console.log(`Active clients: ${activeClients.size}`);

    // Délai pour s'assurer que le socket est prêt
    setTimeout(() => {
      try {
        safelySendMessage(socket, JSON.stringify({
          type: "system",
          message: `Bienvenue ${username}!`
        }));
        
        // Notification aux autres utilisateurs
        for (const client of activeClients) {
          if (client !== socket) {
            safelySendMessage(client, JSON.stringify({
              type: "system",
              message: `${username} a rejoint le chat.`
            }));
          }
        }
      } catch (err) {
        console.error("Error sending welcome message:", err);
      }
    }, 500);

    socket.onmessage = (event) => {
      try {
        const text = event.data;
        console.log(`Message from ${username}:`, text);

        const parsedData = JSON.parse(text);
        const messageData = {
          username,
          message: parsedData.message,
        };

        const broadcastData = JSON.stringify(messageData);
        console.log("Broadcasting:", broadcastData);

        for (const client of activeClients) {
          safelySendMessage(client, broadcastData);
        }
      } catch (err) {
        console.error("Error processing message:", err);
      }
    };

    socket.onclose = () => {
      console.log("WebSocket closed for", username);
      activeClients.delete(socket);
      
      if (clientUserMap.has(socket)) {
        const user = clientUserMap.get(socket);
        clientUserMap.delete(socket);
        
        // Notifier les autres utilisateurs
        if (user) {
          for (const client of activeClients) {
            safelySendMessage(client, JSON.stringify({
              type: "system",
              message: `${user.username} a quitté le chat.`
            }));
          }
        }
      }
    };

    socket.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

  } catch (err) {
    console.error("Token invalid:", err);
    ctx.response.status = 401;
    ctx.response.body = { message: "Unauthorized" };
  }
});

// Chat de ligue privée
router.get("/ws/league-:leagueId", async (ctx) => {
  // Récupérer l'ID de la ligue
  const leagueId = parseInt(ctx.params.leagueId);
  if (isNaN(leagueId)) {
    ctx.response.status = 400;
    ctx.response.body = { message: "ID de ligue invalide" };
    return;
  }
  
  console.log(`WebSocket connection request for league ${leagueId}`);

  // Vérifier l'authentification
  const token = await ctx.cookies.get("token");
  if (!token) {
    console.log("No token found. Rejecting WebSocket connection.");
    ctx.response.status = 401;
    ctx.response.body = { message: "Unauthorized" };
    return;
  }

  try {
    const payload = await verify(token, key);
    const username = payload.sub;
    const userId = payload.id;
    console.log("User authenticated:", username);

    // Vérifier que l'utilisateur est membre de cette ligue
    const members = await privateLeagueRepository.getLeagueMembers(leagueId);
    const isMember = members.some(m => m.user_id === userId);
    
    if (!isMember) {
      ctx.response.status = 403;
      ctx.response.body = { message: "Vous n'êtes pas membre de cette ligue" };
      return;
    }

    if (!ctx.isUpgradable) {
      console.log("Connection is not upgradable to WebSocket");
      ctx.response.status = 400;
      ctx.response.body = { message: "Cannot upgrade to WebSocket" };
      return;
    }

    const socket = await ctx.upgrade();
    console.log(`WebSocket upgraded for user ${username} in league ${leagueId}`);
    
    // Ajouter au chat de ligue
    if (!leagueClients.has(leagueId)) {
      leagueClients.set(leagueId, new Set());
    }
    leagueClients.get(leagueId)!.add(socket);
    
    // Stocker l'association socket-utilisateur
    clientUserMap.set(socket, { userId, username });
    
    console.log(`Active clients in league ${leagueId}: ${leagueClients.get(leagueId)!.size}`);

    // Délai pour s'assurer que le socket est prêt
    setTimeout(async () => {
      try {
        // Charger les derniers messages
        const messages = await leagueChatRepository.getLeagueMessages(leagueId, 20);
        
        // Envoyer l'historique
        safelySendMessage(socket, JSON.stringify({
          type: "history",
          messages: messages.map(m => ({
            username: m.username,
            message: m.message,
            timestamp: m.created_at
          }))
        }));
        
        
      } catch (err) {
        console.error("Error sending welcome messages:", err);
      }
    }, 500);

    socket.onmessage = async (event) => {
      try {
        const text = event.data;
        console.log(`Message from ${username} in league ${leagueId}:`, text);

        const parsedData = JSON.parse(text);
        const messageData = {
          username,
          message: parsedData.message,
        };

        // Enregistrer le message dans la base
        await leagueChatRepository.addMessage({
          private_league_id: leagueId,
          user_id: userId, 
          message: parsedData.message
        });
        
        const broadcastData = JSON.stringify(messageData);
        
        // Diffuser à tous les membres de la ligue
        for (const client of leagueClients.get(leagueId)!) {
          safelySendMessage(client, broadcastData);
        }
      } catch (err) {
        console.error("Error processing message:", err);
      }
    };

    socket.onclose = () => {
      console.log(`WebSocket closed for ${username} in league ${leagueId}`);
      
      // Retirer du chat de ligue
      const clients = leagueClients.get(leagueId);
      if (clients) {
        clients.delete(socket);
        // Nettoyer si vide
        if (clients.size === 0) {
          leagueClients.delete(leagueId);
        }
      }
      
      const user = clientUserMap.get(socket);
      clientUserMap.delete(socket);
    };

    socket.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

  } catch (err) {
    console.error("Token invalid:", err);
    ctx.response.status = 401;
    ctx.response.body = { message: "Unauthorized" };
  }
});

export default router;