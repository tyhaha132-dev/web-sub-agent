import { extSearchLinks } from '../lib/api';

/** Link tra thêm ngoài khi DB + API đều không có từ. */
export default function ExtLinks({ en }: { en: string }) {
  const links = extSearchLinks(en);
  return (
    <div style={{ marginTop: 8, fontSize: 13 }}>
      🔎 Tra thêm: <a href={links.oxford} target="_blank" rel="noreferrer">Oxford</a>
      {' · '}<a href={links.cambridge} target="_blank" rel="noreferrer">Cambridge</a>
      {' · '}<a href={links.google} target="_blank" rel="noreferrer">Google</a>
    </div>
  );
}
