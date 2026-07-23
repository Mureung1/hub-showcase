const request = require('supertest');
const app = require('../server');
const axios = require('axios');

// Mock axios
jest.mock('axios');

describe('API: POST /api/schedule/sync/everytime', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if everytimeUrl is missing', async () => {
    const res = await request(app).post('/api/schedule/sync/everytime').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Everytime share URL is required');
  });

  it('should successfully parse valid XML from Everytime and calculate free slots', async () => {
    // Mock valid XML response from Everytime API
    // 108 = 540 minutes = 9:00 AM, 126 = 630 minutes = 10:30 AM on Day 1 (Tuesday)
    const mockXml = `
      <response>
        <table id="12345" />
        <subject>
          <name value="Database Systems" />
          <data day="1" starttime="108" endtime="126" />
        </subject>
      </response>
    `;

    axios.post.mockResolvedValue({ data: mockXml });

    const res = await request(app)
      .post('/api/schedule/sync/everytime')
      .send({ everytimeUrl: 'https://everytime.kr/@MOCK123' });

    expect(axios.post).toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.parsedClasses).toBe(1);
    
    // Check if free slots are returned as expected
    // Should have freeSlots field
    expect(res.body).toHaveProperty('freeSlots');
    expect(Array.isArray(res.body.freeSlots)).toBe(true);
  });

  it('should return 400 if the XML contains no subjects (invalid URL or schedule)', async () => {
    // Mock empty or invalid XML
    const mockXml = `<response><table id="12345" /></response>`;
    axios.post.mockResolvedValue({ data: mockXml });

    const res = await request(app)
      .post('/api/schedule/sync/everytime')
      .send({ everytimeUrl: 'https://everytime.kr/@MOCK_EMPTY' });

    expect(axios.post).toHaveBeenCalled();
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/시간표를 찾을 수 없거나 파싱에 실패했습니다/);
  });
});
