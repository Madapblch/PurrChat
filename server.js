import { Server } from 'socket.io';

const PORT = process.env.PORT || 3000;
const io = new Server(PORT, {
  cors: { origin: "*" } 
});

io.on('connection', (socket) => {
  console.log('Пользователь вошел:', socket.id);

  // Слушаем сообщение от одного и рассылаем всем
  socket.on('send-message', (data) => {
    io.emit('receive-message', data); 
  });

  socket.on('disconnect', () => {
    console.log('Пользователь ушел');
  });
});

console.log(`Сервер чата запущен на порту ${PORT}`);
