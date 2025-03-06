import { BeforeInsert, BeforeUpdate, Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";

import { Position } from "../../positions/entities/position.entity";
import { Application } from '../../applications/entities/application.entity';


@Entity('cat_colaboradores')
export class User {

    @PrimaryGeneratedColumn('identity')
    idu_usuario: string;

    @Column({
        type: 'varchar', 
        length:255, 
        unique:true
    })
    num_empleado: string;

    @Column({
        type: 'varchar', 
        length:255, 
        unique:true
    })
    nom_correo: string;

    @Column('text', {
        select: false
    })
    nom_contrasena: string;

    @Column({
        type: 'varchar', 
        length:255,
    })
    nom_usuario: string;

    @Column('bool', {
        default: true
    })
    opc_es_activo: boolean;

    // @CreateDateColumn({ type: 'timestamp' })
    // created_at: Date;
  
    // @UpdateDateColumn({ type: 'timestamp' })
    // updated_at: Date;

    @ManyToOne(
        () => Position, position => position.user,
        { eager:true }
    )
    @JoinColumn({ name: 'idu_rol' })
    position: Position

    @OneToMany(
        () => Application, application => application.applicationstatus,
    )
    application:Application[]

    @BeforeInsert()
    checkFieldsBeforeInsert() {
        this.nom_correo = this.nom_correo.toLowerCase().trim();
    }

    @BeforeUpdate()
    checkFieldsBeforeUpdate() {
        this.checkFieldsBeforeInsert();   
    }

}
