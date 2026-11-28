/** v2 Messages (broadcast), /crm/messages (F352-F357). */
import type { ReactNode } from 'react';
import * as v2 from '@/components/v2/ui';
import type { Audience, Broadcast } from '@/lib/crm';
import { isTestBroadcast } from '@/lib/crm';
import { BroadcastV2 } from './forms';
import { MessagesTable } from './Hub';
import { CUSTOMERS_CRUMB, How } from './shared';

export type MessagesV2Data = { audiences: Audience[]; defaultAudience: string; filtersQuery: string; history: Broadcast[]; now: string; hideTest: boolean };

export function MessagesV2({ d }: { d: MessagesV2Data }) {
  const now = new Date(d.now);
  const history = d.hideTest ? d.history.filter((b) => !isTestBroadcast(b)) : d.history;
  return (
    <>
      <v2.PageHeader title="Messages" sub="Tell people something. It lands in their TaskDrop notifications, and phones with the app get a push." crumbs={[CUSTOMERS_CRUMB, { label: 'Messages' }]} />
      <v2.Grid cols="main">
        <div className="wp6-stack">
          <v2.Card title="Write a message" sub="Nothing is sent until you review it and confirm. To message one person, open them from People.">
            <BroadcastV2 audiences={d.audiences} defaultAudience={d.defaultAudience} filtersQuery={d.filtersQuery || undefined} />
          </v2.Card>
          <v2.Note tone="gold" title="Repeat-send protection">
            The same text can’t be sent to the same people twice within 2 minutes, and each staff member can send a limited number of messages an hour. If you hit either, wait a moment and try again.
          </v2.Note>
          <v2.Card title="Sent so far" sub="The latest 30. Newest first.">
            <MessagesTable rows={history} now={now} hideTest={d.hideTest} />
          </v2.Card>
        </div>
        <div>
          <How
            open
            title="Good to know"
            steps={[
              ['Count first', <>You see how many people get it before you send.</>],
              ['5,000 at most', <>Bigger groups: split them with Segments.</>],
              ['Suspended people', <>Left out unless you pick them on purpose.</>],
              ['No take-backs', <>A sent message can’t be taken back. The history is kept.</>],
              ...(d.hideTest ? ([['Test accounts', <>The counts in “Send to” are who really gets it, test accounts included.</>]] as [string, ReactNode][]) : []),
            ]}
          />
        </div>
      </v2.Grid>
    </>
  );
}
