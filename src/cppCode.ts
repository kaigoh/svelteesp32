import { cmdLine } from './commandLine';

export type cppCodeSource = {
  index: number;
  filename: string;
  mime: string;
  content: Buffer;
  isGzip: boolean;
};

const replaceAll = (s: string, from: string, to: string) => {
  while (s.includes(from)) s = s.replace(from, to);
  return s;
};

const blockTemplate = `
  $default$server->on("/$filename$", HTTP_GET, [](PsychicRequest * request)
  {
    PsychicResponse response(request);
    response.setContentType("$mime$");
    response.addHeader("Content-Encoding", "$encoding$");
    response.setContent(data$index$, sizeof(data$index$));
    return response.send();
  });
`;

const getCppBlock = (source: cppCodeSource): string => {
  let result = blockTemplate;

  result = replaceAll(
    result,
    '$default$',
    source.filename.startsWith('index.htm') ? 'server->defaultEndpoint = ' : ''
  );
  result = replaceAll(result, '$index$', source.index.toString());
  result = replaceAll(result, '$filename$', source.filename);
  result = replaceAll(result, '$size$', source.content.length.toString());
  result = replaceAll(result, '$mime$', source.mime);
  result = replaceAll(result, '$encoding$', source.isGzip ? 'gzip' : 'identity');
  return result;
};

const fileTemplate = `
$arrays$

void $method$(PsychicHttpServer * server) {
$code$
}`;

export const getCppCode = (sources: cppCodeSource[]) => {
  const arrays: string[] = [];
  const blocks: string[] = [];
  for (const source of sources) {
    const bytesString = [...source.content].map((v) => `0x${v.toString(16)}`).join(', ');
    arrays.push(`const uint8_t data${source.index}[${source.content.length}] = {${bytesString}};`);
    blocks.push(getCppBlock(source));
  }

  let result = fileTemplate;
  result = replaceAll(result, '$arrays$', arrays.join('\n'));
  result = replaceAll(result, '$method$', cmdLine.espMethodName);
  result = replaceAll(result, '$code$', blocks.join(''));
  return result;
};
