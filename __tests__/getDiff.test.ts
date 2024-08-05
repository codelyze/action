import axios from 'axios';
import * as fs from 'fs';
import { getLatestCommitSha, getPatchOrDiff } from '../src/getDiff';

jest.mock('axios');
jest.mock('fs');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('getPatchOrDiff', () => {
  const owner = 'test-owner';
  const repo = 'test-repo';
  const commitSha = 'test-sha';
  const fileType = 'patch';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch the latest commit SHA', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: [{ sha: commitSha }],
    });

    const sha = await getLatestCommitSha(owner, repo);
    expect(sha).toBe(commitSha);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      `https://api.github.com/repos/${owner}/${repo}/commits`,
      { headers: { 'Accept': 'application/vnd.github.v3+json' } }
    );
  });

  it('should download the patch file', async () => {
    const patchContent = 'patch content';
    mockedAxios.get.mockResolvedValueOnce({ data: patchContent });

    await getPatchOrDiff(owner, repo, commitSha, fileType);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      `https://github.com/${owner}/${repo}/commit/${commitSha}.${fileType}`,
      { responseType: 'arraybuffer' }
    );
    expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
      `commit.${fileType}`,
      patchContent
    );
  });
});
