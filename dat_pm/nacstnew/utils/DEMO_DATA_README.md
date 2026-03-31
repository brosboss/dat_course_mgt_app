# Demo Data for Course Nomination / Personnel Course Details

This loads demo data so you can present **Course Nomination** and **Personnel Course Details** to your superior.

## What it creates

1. **Reference data** (if missing): Personnel Category "Demo Category", Ranks (Corporal, Sergeant, Captain), Unit "Demo Unit", Grade "Pass".
2. **Course Names** with **Qualified Rank** and **Mandatory Prerequisite Course**:
   - **Basic Training** – ranks: Corporal, Sergeant. No prerequisite.
   - **Advanced Training** – ranks: Sergeant, Captain. Prerequisite: Basic Training.
   - **Leadership Course** – ranks: Captain. Prerequisite: Advanced Training.
3. **Personnel**: DEMO-P001 to DEMO-P005 (different ranks and names).
4. **Course Attended** (submitted, legacy):
   - P001: Basic only → eligible for **Advanced**.
   - P002: Basic + Advanced → eligible for **Leadership**.
   - P003: none → eligible for **Basic** only.
   - P004: Basic only → eligible for **Advanced**.
   - P005: Advanced only → eligible for **Leadership**.

## How to run

From your bench folder (e.g. `bench-v15-dat`), with your site name (e.g. `hqdat`):

```bash
bench --site hqdat execute nacstnew.nacstnew.doctype.course_nomination.course_nomination.set_demo_data
```

Then open:

- **Course Nomination** (or Course Nomination Analysis page): select a course and see personnel due; add to nomination and save.
- **Personnel Course Details** page: select a personnel and see courses attended and courses eligible for.
