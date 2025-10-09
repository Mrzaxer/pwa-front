import { useState } from 'react';
import { postService } from '../services/postService.js';
import './CreatePost.css';

const CreatePost = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const postData = {
      title,
      content,
      timestamp: new Date().toISOString()
    };

    try {
      const result = await postService.sendPost('/api/posts', postData);
      
      if (result.success === false && result.localId) {
        setMessage('📝 Post guardado localmente. Se enviará cuando haya conexión.');
      } else {
        setMessage('✅ Post publicado exitosamente!');
        setTitle('');
        setContent('');
      }
    } catch (error) {
      setMessage('❌ Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = () => {
    postService.syncPendingPosts();
    setMessage('🔄 Sincronización manual iniciada...');
  };

  return (
    <div className="create-post">
      <h2>Crear Nuevo Post</h2>
      
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Título del post"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        
        <textarea
          placeholder="Contenido del post"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />
        
        <button type="submit" disabled={loading}>
          {loading ? 'Enviando...' : 'Publicar Post'}
        </button>
      </form>

      {message && (
        <div className={`message ${message.includes('✅') ? 'success' : 'info'}`}>
          {message}
        </div>
      )}

      <button 
        onClick={handleManualSync}
        className="sync-btn"
      >
        🔄 Sincronizar Manualmente
      </button>
    </div>
  );
};

export default CreatePost;