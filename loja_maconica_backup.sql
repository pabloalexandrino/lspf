


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";





SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."caixas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "descricao" "text",
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."caixas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cargos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "cor" "text" DEFAULT '#6b7280'::"text" NOT NULL,
    "ordem" integer DEFAULT 0,
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."cargos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."consumo_produtos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sessao_id" "uuid",
    "member_id" "uuid",
    "produto_id" "uuid",
    "quantidade" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."consumo_produtos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lancamentos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sessao_id" "uuid",
    "member_id" "uuid",
    "tipo" "text" NOT NULL,
    "descricao" "text",
    "valor" numeric(10,2) NOT NULL,
    "pago" boolean DEFAULT false,
    "data_pagamento" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "caixa_id" "uuid",
    CONSTRAINT "lancamentos_tipo_check" CHECK (("tipo" = ANY (ARRAY['sessao'::"text", 'agape'::"text", 'produto'::"text", 'mensalidade'::"text", 'oferta'::"text", 'deposito'::"text", 'abertura'::"text", 'saida_caixa'::"text", 'outro'::"text", 'rendimento'::"text"])))
);


ALTER TABLE "public"."lancamentos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."member_cargos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "member_id" "uuid",
    "cargo_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."member_cargos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "nome_historico" "text",
    "data_nascimento" "date",
    "cargo" "text",
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "whatsapp" "text"
);


ALTER TABLE "public"."members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mensalidades" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "member_id" "uuid",
    "mes_referencia" "date" NOT NULL,
    "valor" numeric(10,2) DEFAULT 0 NOT NULL,
    "pago" boolean DEFAULT false,
    "data_pagamento" "date",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."mensalidades" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."presenca_agape" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sessao_id" "uuid",
    "member_id" "uuid"
);


ALTER TABLE "public"."presenca_agape" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."presenca_sessao" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sessao_id" "uuid",
    "member_id" "uuid"
);


ALTER TABLE "public"."presenca_sessao" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."produtos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "preco" numeric(10,2) NOT NULL,
    "descricao" "text",
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."produtos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sessoes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "data" "date" NOT NULL,
    "descricao" "text",
    "custo_sessao" numeric(10,2) DEFAULT 0,
    "custo_sessao_descricao" "text",
    "tem_agape" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "custo_agape" numeric(10,2) DEFAULT 0,
    "custo_agape_descricao" "text"
);


ALTER TABLE "public"."sessoes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tronco_solidariedade" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sessao_id" "uuid",
    "valor" numeric(10,2) DEFAULT 0 NOT NULL,
    "observacao" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tronco_solidariedade" OWNER TO "postgres";


ALTER TABLE ONLY "public"."caixas"
    ADD CONSTRAINT "caixas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cargos"
    ADD CONSTRAINT "cargos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."consumo_produtos"
    ADD CONSTRAINT "consumo_produtos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lancamentos"
    ADD CONSTRAINT "lancamentos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."member_cargos"
    ADD CONSTRAINT "member_cargos_member_id_cargo_id_key" UNIQUE ("member_id", "cargo_id");



ALTER TABLE ONLY "public"."member_cargos"
    ADD CONSTRAINT "member_cargos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mensalidades"
    ADD CONSTRAINT "mensalidades_member_id_mes_referencia_key" UNIQUE ("member_id", "mes_referencia");



ALTER TABLE ONLY "public"."mensalidades"
    ADD CONSTRAINT "mensalidades_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."presenca_agape"
    ADD CONSTRAINT "presenca_agape_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."presenca_agape"
    ADD CONSTRAINT "presenca_agape_sessao_id_member_id_key" UNIQUE ("sessao_id", "member_id");



ALTER TABLE ONLY "public"."presenca_sessao"
    ADD CONSTRAINT "presenca_sessao_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."presenca_sessao"
    ADD CONSTRAINT "presenca_sessao_sessao_id_member_id_key" UNIQUE ("sessao_id", "member_id");



ALTER TABLE ONLY "public"."produtos"
    ADD CONSTRAINT "produtos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sessoes"
    ADD CONSTRAINT "sessoes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tronco_solidariedade"
    ADD CONSTRAINT "tronco_solidariedade_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tronco_solidariedade"
    ADD CONSTRAINT "tronco_solidariedade_sessao_id_key" UNIQUE ("sessao_id");



ALTER TABLE ONLY "public"."consumo_produtos"
    ADD CONSTRAINT "consumo_produtos_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consumo_produtos"
    ADD CONSTRAINT "consumo_produtos_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consumo_produtos"
    ADD CONSTRAINT "consumo_produtos_sessao_id_fkey" FOREIGN KEY ("sessao_id") REFERENCES "public"."sessoes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lancamentos"
    ADD CONSTRAINT "lancamentos_caixa_id_fkey" FOREIGN KEY ("caixa_id") REFERENCES "public"."caixas"("id");



ALTER TABLE ONLY "public"."lancamentos"
    ADD CONSTRAINT "lancamentos_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lancamentos"
    ADD CONSTRAINT "lancamentos_sessao_id_fkey" FOREIGN KEY ("sessao_id") REFERENCES "public"."sessoes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."member_cargos"
    ADD CONSTRAINT "member_cargos_cargo_id_fkey" FOREIGN KEY ("cargo_id") REFERENCES "public"."cargos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."member_cargos"
    ADD CONSTRAINT "member_cargos_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mensalidades"
    ADD CONSTRAINT "mensalidades_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."presenca_agape"
    ADD CONSTRAINT "presenca_agape_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."presenca_agape"
    ADD CONSTRAINT "presenca_agape_sessao_id_fkey" FOREIGN KEY ("sessao_id") REFERENCES "public"."sessoes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."presenca_sessao"
    ADD CONSTRAINT "presenca_sessao_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."presenca_sessao"
    ADD CONSTRAINT "presenca_sessao_sessao_id_fkey" FOREIGN KEY ("sessao_id") REFERENCES "public"."sessoes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tronco_solidariedade"
    ADD CONSTRAINT "tronco_solidariedade_sessao_id_fkey" FOREIGN KEY ("sessao_id") REFERENCES "public"."sessoes"("id") ON DELETE CASCADE;



CREATE POLICY "authenticated can do everything on cargos" ON "public"."cargos" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated can do everything on member_cargos" ON "public"."member_cargos" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated_all_caixas" ON "public"."caixas" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated_all_consumo_produtos" ON "public"."consumo_produtos" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated_all_lancamentos" ON "public"."lancamentos" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated_all_members" ON "public"."members" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated_all_mensalidades" ON "public"."mensalidades" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated_all_presenca_agape" ON "public"."presenca_agape" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated_all_presenca_sessao" ON "public"."presenca_sessao" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated_all_produtos" ON "public"."produtos" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated_all_sessoes" ON "public"."sessoes" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated_all_tronco" ON "public"."tronco_solidariedade" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."caixas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cargos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consumo_produtos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lancamentos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."member_cargos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mensalidades" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."presenca_agape" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."presenca_sessao" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."produtos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sessoes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tronco_solidariedade" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";














































































































































































GRANT ALL ON TABLE "public"."caixas" TO "anon";
GRANT ALL ON TABLE "public"."caixas" TO "authenticated";
GRANT ALL ON TABLE "public"."caixas" TO "service_role";



GRANT ALL ON TABLE "public"."cargos" TO "anon";
GRANT ALL ON TABLE "public"."cargos" TO "authenticated";
GRANT ALL ON TABLE "public"."cargos" TO "service_role";



GRANT ALL ON TABLE "public"."consumo_produtos" TO "anon";
GRANT ALL ON TABLE "public"."consumo_produtos" TO "authenticated";
GRANT ALL ON TABLE "public"."consumo_produtos" TO "service_role";



GRANT ALL ON TABLE "public"."lancamentos" TO "anon";
GRANT ALL ON TABLE "public"."lancamentos" TO "authenticated";
GRANT ALL ON TABLE "public"."lancamentos" TO "service_role";



GRANT ALL ON TABLE "public"."member_cargos" TO "anon";
GRANT ALL ON TABLE "public"."member_cargos" TO "authenticated";
GRANT ALL ON TABLE "public"."member_cargos" TO "service_role";



GRANT ALL ON TABLE "public"."members" TO "anon";
GRANT ALL ON TABLE "public"."members" TO "authenticated";
GRANT ALL ON TABLE "public"."members" TO "service_role";



GRANT ALL ON TABLE "public"."mensalidades" TO "anon";
GRANT ALL ON TABLE "public"."mensalidades" TO "authenticated";
GRANT ALL ON TABLE "public"."mensalidades" TO "service_role";



GRANT ALL ON TABLE "public"."presenca_agape" TO "anon";
GRANT ALL ON TABLE "public"."presenca_agape" TO "authenticated";
GRANT ALL ON TABLE "public"."presenca_agape" TO "service_role";



GRANT ALL ON TABLE "public"."presenca_sessao" TO "anon";
GRANT ALL ON TABLE "public"."presenca_sessao" TO "authenticated";
GRANT ALL ON TABLE "public"."presenca_sessao" TO "service_role";



GRANT ALL ON TABLE "public"."produtos" TO "anon";
GRANT ALL ON TABLE "public"."produtos" TO "authenticated";
GRANT ALL ON TABLE "public"."produtos" TO "service_role";



GRANT ALL ON TABLE "public"."sessoes" TO "anon";
GRANT ALL ON TABLE "public"."sessoes" TO "authenticated";
GRANT ALL ON TABLE "public"."sessoes" TO "service_role";



GRANT ALL ON TABLE "public"."tronco_solidariedade" TO "anon";
GRANT ALL ON TABLE "public"."tronco_solidariedade" TO "authenticated";
GRANT ALL ON TABLE "public"."tronco_solidariedade" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































