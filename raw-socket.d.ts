// raw-socket.d.ts

declare module 'raw-socket' {
    export interface RawSocket {
        createSocket(options: { protocol: Protocol }): RawSocket;
        send(buffer: Buffer, offset: number, length: number, destination: string | number, callback?: (error?: Error) => void): void;
        on(event: 'message', listener: (buffer: Buffer, source: string) => void): void;
        on(event: 'error', listener: (error: Error) => void): void;
        close(callback?: () => void): void;
    }

    export enum Protocol {
        ICMP = 'icmp',
        ICMPv6 = 'icmpv6',
        UDP = 'udp',
        TCP = 'tcp',
        IP = 'ip',
        IPv6 = 'ipv6',
        UNKNOWN = 'unknown'
    }

    export function createSocket(options: { protocol: Protocol }): RawSocket;
}
