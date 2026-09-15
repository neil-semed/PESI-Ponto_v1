import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export type Perfil = 'ADMIN' | 'COORDENADOR' | 'DIRETOR' | 'OFICINEIRO'
export type SessionProfile = { id: string; email: string; nome: string; perfil: Perfil; escola_id: string | null; ativo: boolean; precisa_trocar_senha: boolean }

type State = {
  session: SessionProfile | null
  loading: boolean
  init: () => Promise<void>
  signIn: (email: string, senha: string) => Promise<void>
  signOut: () => Promise<void>
}

export const useAuth = create<State>((set) => ({
  session: null,
  loading: true,
  init: async () => {
    const { data } = await supabase.auth.getSession()
    if (!data.session) { set({ session: null, loading: false }); return }
    const { data: p } = await supabase.from('profiles').select('*').eq('id', data.session.user.id).single()
    set({ session: p as SessionProfile ?? null, loading: false })
  },
  signIn: async (email, senha) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) throw error
    const { data: p } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
    if (!p) throw new Error('Perfil não encontrado — contate admin')
    if (!p.ativo) throw new Error('Usuário inativo')
    set({ session: p as SessionProfile })
  },
  signOut: async () => { await supabase.auth.signOut(); set({ session: null }) },
}))
