import request from 'supertest';
import { app } from './index';

describe('GET /health', () => {
  it('should return 200 OK and health status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: 'ok',
      db: expect.any(String),
      redis: expect.any(String),
    });
  });
});
