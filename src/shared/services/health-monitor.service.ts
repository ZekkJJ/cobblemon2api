/**
 * Servicio de Monitoreo de Salud
 * Cobblemon Los Pitufos - Backend API
 * 
 * Monitorea el estado de la base de datos, caché y servicios
 */

import { MongoClient } from 'mongodb';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: Date;
  checks: {
    database: ComponentHealth;
    memory: ComponentHealth;
    uptime: ComponentHealth;
  };
}

export interface ComponentHealth {
  status: 'healthy' | 'unhealthy';
  message: string;
  responseTime?: number;
  details?: Record<string, unknown>;
}

export interface SystemMetrics {
  timestamp: Date;
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  requests: {
    total: number;
    errors: number;
    errorRate: number;
  };
  endpoints: Record<string, EndpointMetrics>;
}

export interface EndpointMetrics {
  requestCount: number;
  errorCount: number;
  totalResponseTime: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  responseTimes: number[];
}

export class HealthMonitorService {
  private startTime: number = Date.now();
  private requestMetrics: Map<string, EndpointMetrics> = new Map();
  private totalRequests: number = 0;
  private totalErrors: number = 0;

  constructor(private mongoClient: MongoClient | null) {}

  /**
   * Verifica el estado de la base de datos
   */
  async checkDatabase(): Promise<ComponentHealth> {
    const start = Date.now();
    
    try {
      if (!this.mongoClient) {
        return {
          status: 'unhealthy',
          message: 'MongoDB client not initialized',
          responseTime: Date.now() - start,
        };
      }

      // Ping a la base de datos
      await this.mongoClient.db().admin().ping();
      
      const responseTime = Date.now() - start;

      return {
        status: 'healthy',
        message: 'Database connection is healthy',
        responseTime,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        responseTime: Date.now() - start,
      };
    }
  }

  /**
   * Verifica el estado de la memoria
   */
  checkMemory(): ComponentHealth {
    const memUsage = process.memoryUsage();
    const usedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const totalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const percentage = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);

    const isHealthy = percentage < 90;

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      message: isHealthy 
        ? `Memory usage is normal (${percentage}%)`
        : `Memory usage is high (${percentage}%)`,
      details: {
        usedMB,
        totalMB,
        percentage,
      },
    };
  }

  /**
   * Verifica el uptime del sistema
   */
  checkUptime(): ComponentHealth {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    const uptimeMinutes = Math.floor(uptimeSeconds / 60);
    const uptimeHours = Math.floor(uptimeMinutes / 60);

    return {
      status: 'healthy',
      message: `System has been running for ${uptimeHours}h ${uptimeMinutes % 60}m`,
      details: {
        uptimeSeconds,
        startTime: new Date(this.startTime).toISOString(),
      },
    };
  }

  /**
   * Obtiene el estado completo del sistema
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const [database, memory, uptime] = await Promise.all([
      this.checkDatabase(),
      Promise.resolve(this.checkMemory()),
      Promise.resolve(this.checkUptime()),
    ]);

    // Determinar estado general
    const allHealthy = [database, memory, uptime].every(check => check.status === 'healthy');
    const anyUnhealthy = [database, memory, uptime].some(check => check.status === 'unhealthy');

    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    if (anyUnhealthy) {
      overallStatus = 'unhealthy';
    } else if (!allHealthy) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date(),
      checks: {
        database,
        memory,
        uptime,
      },
    };
  }

  /**
   * Registra una request para métricas
   */
  recordRequest(endpoint: string, responseTime: number, isError: boolean = false): void {
    this.totalRequests++;
    if (isError) {
      this.totalErrors++;
    }

    let metrics = this.requestMetrics.get(endpoint);
    if (!metrics) {
      metrics = {
        requestCount: 0,
        errorCount: 0,
        totalResponseTime: 0,
        averageResponseTime: 0,
        p95ResponseTime: 0,
        responseTimes: [],
      };
      this.requestMetrics.set(endpoint, metrics);
    }

    metrics.requestCount++;
    if (isError) {
      metrics.errorCount++;
    }
    metrics.totalResponseTime += responseTime;
    metrics.responseTimes.push(responseTime);

    // Mantener solo las últimas 1000 mediciones para calcular p95
    if (metrics.responseTimes.length > 1000) {
      metrics.responseTimes.shift();
    }

    // Calcular promedio
    metrics.averageResponseTime = Math.round(metrics.totalResponseTime / metrics.requestCount);

    // Calcular p95
    const sorted = [...metrics.responseTimes].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    metrics.p95ResponseTime = sorted[p95Index] || 0;
  }

  /**
   * Obtiene las métricas del sistema
   */
  getMetrics(): SystemMetrics {
    const memUsage = process.memoryUsage();
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    const endpoints: Record<string, EndpointMetrics> = {};
    for (const [endpoint, metrics] of this.requestMetrics.entries()) {
      endpoints[endpoint] = { ...metrics };
    }

    return {
      timestamp: new Date(),
      uptime,
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024),
        total: Math.round(memUsage.heapTotal / 1024 / 1024),
        percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
      },
      requests: {
        total: this.totalRequests,
        errors: this.totalErrors,
        errorRate: this.totalRequests > 0 ? Math.round((this.totalErrors / this.totalRequests) * 100) : 0,
      },
      endpoints,
    };
  }

  /**
   * Resetea las métricas
   */
  resetMetrics(): void {
    this.requestMetrics.clear();
    this.totalRequests = 0;
    this.totalErrors = 0;
  }
}
