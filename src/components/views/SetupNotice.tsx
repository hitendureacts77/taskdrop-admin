import { Notice } from '../ui';

/** Shown instead of an empty page when the database update behind a screen has not been applied yet. */
export function SetupNotice({ what, migration }: { what: string; migration: string }) {
  return (
    <Notice tone="gold" title={`${what} isn’t switched on yet`}>
      It needs the database update <strong>{migration}</strong> from the app repo. Nothing is broken: once the owner applies it to this database, this page fills in by itself.
    </Notice>
  );
}

export function ReadError({ message }: { message: string }) {
  return (
    <Notice tone="red" title="Couldn’t read this">
      {message}
    </Notice>
  );
}
