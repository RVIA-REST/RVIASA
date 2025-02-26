import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Application } from '../../applications/entities/application.entity';


@Entity('ctl_estatus_aplicaciones')
export class Applicationstatus {

    @PrimaryGeneratedColumn('identity')
    idu_estatus_aplicacion: number;

    @Column({type: 'varchar', length:20})
    des_estatus_aplicacion  : string;

    // @CreateDateColumn({ type: 'timestamp' })
    // created_at: Date;
  
    // @UpdateDateColumn({ type: 'timestamp' })
    // updated_at: Date;

    @OneToMany(
        () => Application, application => application.applicationstatus,
    )
    application:Application[]
}
