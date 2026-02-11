/**
 * Connection Manager - Gestión de conexiones persistentes a MySQL
 * Optimiza el uso de conexiones mediante pooling y reutilización
 */

class ConnectionManager {
  constructor(pool) {
    this.pool = pool;
    this.connections = new Map();
    this.lastUsed = new Map();
    this.maxIdleTime = 300000; // 5 minutos
    this.maxConnections = 5;
    
    setInterval(() => this.cleanupIdleConnections(), 60000);
  }
  
  async getConnection(operationType = 'default') {
    // Si ya existe una conexión para este tipo, reutilizarla
    if (this.connections.has(operationType)) {
      const conn = this.connections.get(operationType);
      
      // Verificar que la conexión sigue activa
      try {
        await conn.query('SELECT 1');
        this.lastUsed.set(operationType, Date.now());
        return conn;
      } catch (error) {
        console.log(`Conexión ${operationType} expiró, creando nueva...`);
        this.connections.delete(operationType);
        this.lastUsed.delete(operationType);
      }
    }
    
    // Crear nueva conexión si no existe o expiró
    if (this.connections.size < this.maxConnections) {
      const conn = await this.pool.getConnection();
      
      this.connections.set(operationType, conn);
      this.lastUsed.set(operationType, Date.now());
      
      console.log(`Nueva conexión persistente creada: ${operationType} (Total: ${this.connections.size})`);
      return conn;
    }
    
    // Si ya hay máximo de conexiones, usar una existente (round-robin)
    const connectionTypes = Array.from(this.connections.keys());
    const selectedType = connectionTypes[Math.floor(Math.random() * connectionTypes.length)];
    const conn = this.connections.get(selectedType);
    
    this.lastUsed.set(selectedType, Date.now());
    return conn;
  }
  
  async executeQuery(sql, params = [], operationType = 'default', retries = 3) {
    let attempt = 0;
    
    while (attempt < retries) {
      try {
        const conn = await this.getConnection(operationType);
        const result = await conn.query(sql, params);
        return result;
        
      } catch (error) {
        console.error(`Query error (attempt ${attempt + 1}/${retries}) [${operationType}]:`, error.message);
        
        // Si es error de conexión, limpiar y reintentar
        if (error.code === 'ER_CLIENT_INTERACTION_TIMEOUT' || 
            error.code === 'PROTOCOL_CONNECTION_LOST' ||
            error.code === 'ER_CONNECTION_LOST') {
          
          this.connections.delete(operationType);
          this.lastUsed.delete(operationType);
          attempt++;
          
          if (attempt < retries) {
            console.log(`Reintentando query [${operationType}] en 1 segundo...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
        }
        throw error;
      }
    }
  }
  
  cleanupIdleConnections() {
    const now = Date.now();
    const toRemove = [];
    
    for (const [type, lastUsed] of this.lastUsed.entries()) {
      if (now - lastUsed > this.maxIdleTime) {
        toRemove.push(type);
      }
    }
    
    toRemove.forEach(type => {
      const conn = this.connections.get(type);
      if (conn) {
        conn.release();
        console.log(`Conexión idle liberada: ${type}`);
      }
      this.connections.delete(type);
      this.lastUsed.delete(type);
    });
  }
  
  async closeAll() {
    for (const [type, conn] of this.connections.entries()) {
      try {
        conn.release();
        console.log(`Conexión cerrada: ${type}`);
      } catch (error) {
        console.error(`Error cerrando conexión ${type}:`, error.message);
      }
    }
    this.connections.clear();
    this.lastUsed.clear();
  }
}

module.exports = ConnectionManager;
