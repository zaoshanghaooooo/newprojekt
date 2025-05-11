// Service Worker 注册脚本
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js')
      .then(function(registration) {
        console.log('Service Worker 注册成功，作用域: ', registration.scope);
        
        // 检查Service Worker更新
        registration.addEventListener('updatefound', function() {
          const newWorker = registration.installing;
          console.log('发现Service Worker更新，状态: ', newWorker.state);
          
          newWorker.addEventListener('statechange', function() {
            console.log('Service Worker状态变化: ', newWorker.state);
          });
        });
      })
      .catch(function(error) {
        console.error('Service Worker 注册失败: ', error);
      });
    
    // 检测网络状态
    function updateOnlineStatus() {
      const condition = navigator.onLine ? '在线' : '离线';
      console.log(`当前网络状态: ${condition}`);
      
      // 通知Service Worker当前状态
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'ONLINE_STATUS_CHANGE',
          online: navigator.onLine
        });
      }
      
      // 更新应用UI
      document.body.classList.toggle('offline', !navigator.onLine);
      
      // 显示通知
      if (!navigator.onLine) {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('猫咪打印', {
            body: '您的设备当前处于离线状态，新订单将会保存到离线队列',
            icon: '/icons/icon-192.png'
          });
        }
      }
    }

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    // 初始检查
    updateOnlineStatus();
    
    // 监听来自Service Worker的消息
    navigator.serviceWorker.addEventListener('message', function(event) {
      console.log('收到来自Service Worker的消息:', event.data);
      
      if (event.data && event.data.type === 'OFFLINE_SYNC_COMPLETED') {
        // 显示同步完成的通知
        if (event.data.success) {
          console.log('离线队列同步成功:', event.data.result);
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('同步完成', {
              body: `离线队列已同步, ${event.data.result.succeeded}/${event.data.result.processed} 成功`,
              icon: '/icons/icon-192.png'
            });
          }
        } else {
          console.error('离线队列同步失败:', event.data.error);
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('同步失败', {
              body: `离线队列同步失败: ${event.data.error}`,
              icon: '/icons/icon-192.png'
            });
          }
        }
      }
    });
    
    // 请求通知权限
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission(function(permission) {
        if (permission === 'granted') {
          console.log('通知权限已授予');
        }
      });
    }
  });
} 