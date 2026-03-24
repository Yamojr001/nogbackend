import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * RolePermission â€“ Fine-grained RBAC permission definitions.
 * Maps each (role, resource, action) combination to allow/deny.
 * This decouples permissions from hardcoded logic, enabling Super Admin to configure them.
 *
 * Resources: organisations, members, users, loans, wallets, transactions,
 *            approvals, reports, audit_logs, system_config, settlements, products
 *
 * Actions: create, read, update, delete, approve, reject, suspend, export, configure
 */
@Entity('role_permissions')
export class RolePermission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  role: string; // e.g., 'super_admin', 'finance_admin', 'auditor', 'partner_admin'

  @Column()
  resource: string; // e.g., 'loans', 'members', 'settlements'

  @Column()
  action: string; // e.g., 'approve', 'read', 'export'

  @Column({ default: true })
  allowed: boolean;

  @Column({ nullable: true, type: 'text' })
  condition: string; // Optional JSON condition (e.g., "only own org data")

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ default: false })
  isSystemDefault: boolean; // System-managed vs admin-customised

  @Column({ nullable: true })
  updatedBy: number; // FK to User who last changed this

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
