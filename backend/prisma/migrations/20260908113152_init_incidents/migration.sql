-- CreateTable
CREATE TABLE "incidents" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "location" VARCHAR(255) NOT NULL,
    "short_cause" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "local_summary" TEXT NOT NULL,
    "local_risk_level" VARCHAR(20) NOT NULL,
    "sif_precursor_density_score" SMALLINT NOT NULL,
    "life_saving_rule" VARCHAR(100) NOT NULL,
    "fatal_potential_flag" BOOLEAN NOT NULL,
    "risk_reasoning" TEXT NOT NULL,
    "corrective_actions" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);
