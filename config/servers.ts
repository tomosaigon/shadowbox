export interface MastodonServer {
  baseUrl: string;
  slug: string;
  name: string;
}

export const servers: MastodonServer[] = [
  {
    baseUrl: 'https://fosstodon.org',
    slug: 'fosstodon',
    name: 'Fosstodon'
  }
];

export function getServerBySlug(slug: string): MastodonServer | undefined {
  return servers.find(server => server.slug === slug);
} 