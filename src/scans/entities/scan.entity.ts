import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Application } from '../../applications/entities/application.entity';

@Entity('mov_escaneos')
export class Scan {
    @PrimaryGeneratedColumn('identity')
    idu_escaneo: number;

    @Column({type: 'varchar', length:255})
    nom_escaneo: string;

    @Column({type: 'varchar', length:20})
    nom_directorio: string;

    @ManyToOne(() => Application, application => application.scans, { nullable: false })
    @JoinColumn({ name: 'idu_aplicacion' })
    application: Application;

}
