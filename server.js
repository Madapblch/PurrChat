const io = require('socket.io')(process.env.PORT || 3000, {
  cors: { origin: "*" }
});

io.on('connection', (socket) => {
  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-connected', userId);
  });
  // Логика передачи офферов и ответов WebRTC
  socket.on('signal', (data) => {
    io.to(data.to).emit('signal', data);
  });
});
