import { ObjectLoader } from 'three';

export const loadModel = async (importer: () => Promise<any>) => {
  const json = await importer();
  const obj = new ObjectLoader().parse(json);
  return obj;
};
