import { Server } from 'socket.io';

const PORT = process.env.PORT || 3000;
const io = new Server(PORT, {
  cors: { origin: "*" } // Разрешаем фронтенду подключаться
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-connected', userId);
  });

  socket.on('signal', (data) => {
    io.to(data.to).emit('signal', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

console.log(`Server is running on port ${PORT}`);
