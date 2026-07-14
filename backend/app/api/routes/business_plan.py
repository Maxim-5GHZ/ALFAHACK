from fastapi import APIRouter

from app.schemas.business_plan import BusinessPlanRequest, BusinessPlanResponse

router = APIRouter(prefix="/business-plan", tags=["business-plan"])


@router.post("/generate", response_model=BusinessPlanResponse)
def generate_business_plan(request: BusinessPlanRequest):
    pass
