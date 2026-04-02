import { Server } from 'socket.io';

const PORT = process.env.PORT || 3000;

const io = new Server(PORT, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('Новое подключение:', socket.id);

  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-connected', userId);
    console.log(`Пользователь ${userId} зашел в комнату ${roomId}`);
  });

  // Логика передачи офферов и ответов WebRTC
  socket.on('signal', (data) => {
    // data должна содержать поле 'to' (ID получателя)
    io.to(data.to).emit('signal', data);
  });

  socket.on('disconnect', () => {
    console.log('Пользователь отключился:', socket.id);
  });
});

console.log(`Сервер запущен на порту ${PORT}`);
