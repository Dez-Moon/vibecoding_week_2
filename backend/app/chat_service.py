import json
import os
from typing import Any, Dict, Generator, List, Optional

import litellm

from .schemas import (
    ChatMessage,
    ExtractedField,
    FieldExtraction,
    GreetingResponse,
)

REQUIRED_FIELDS = {
    "Mutual Non-Disclosure Agreement": [
        "party_a_name", "party_b_name", "effective_date", "purpose", "term_years", "governing_state"
    ],
    "Mutual NDA Cover Page": [
        "party_a_name", "party_b_name", "effective_date", "mnda_term", "governing_law", "jurisdiction"
    ],
    "Cloud Service Agreement": [
        "provider_name", "customer_name", "effective_date", "service_description", "term_years", "governing_law"
    ],
    "Design Partner Agreement": [
        "company_name", "partner_name", "effective_date", "product_description", "term_years"
    ],
    "Service Level Agreement": [
        "provider_name", "customer_name", "effective_date", "service_description", "uptime_percentage", "term_years"
    ],
    "Professional Services Agreement": [
        "provider_name", "client_name", "effective_date", "project_description", "term_years", "governing_law"
    ],
    "Partnership Agreement": [
        "party_a_name", "party_b_name", "effective_date", "partnership_purpose", "term_years"
    ],
    "Software License Agreement": [
        "licensor_name", "licensee_name", "effective_date", "software_name", "license_type", "term_years"
    ],
    "Data Processing Agreement": [
        "data_controller", "data_processor", "effective_date", "processing_description", "term_years"
    ],
    "Pilot Agreement": [
        "provider_name", "customer_name", "effective_date", "pilot_scope", "pilot_duration", "governing_law"
    ],
    "Business Associate Agreement": [
        "covered_entity", "business_associate", "effective_date", "phi_description", "term_years"
    ],
    "AI Addendum": [
        "provider_name", "customer_name", "effective_date", "ai_feature_description", "term_years", "governing_law"
    ],
}

GREETINGS = {
    "Mutual Non-Disclosure Agreement": (
        "Hello! I'm here to help you create a Mutual Non-Disclosure Agreement. "
        "I'll need some details about the parties involved and the terms of the agreement. "
        "Let's start with the names of both parties. Who is the first party (the disclosing party)?"
    ),
    "Mutual NDA Cover Page": (
        "Hello! Let's create the cover page for your Mutual NDA. "
        "I'll need the names of both parties, the effective date, the NDA term length, "
        "governing law, and jurisdiction. Who is the first party?"
    ),
    "Cloud Service Agreement": (
        "Hello! I'll help you draft a Cloud Service Agreement. "
        "I'll need information about the provider, customer, service details, and terms. "
        "Let's start with the provider's name."
    ),
    "Design Partner Agreement": (
        "Hello! Let's create a Design Partner Agreement. "
        "I'll need to know about the company, the partner, the product, and the agreement term. "
        "Let's start with your company name."
    ),
    "Service Level Agreement": (
        "Hello! I'll help you draft a Service Level Agreement. "
        "I'll need details about the provider, customer, service description, uptime targets, and term. "
        "Let's start with the provider's name."
    ),
    "Professional Services Agreement": (
        "Hello! Let's create a Professional Services Agreement. "
        "I'll need details about the provider, client, project, and terms. "
        "Let's start with the provider's name."
    ),
    "Partnership Agreement": (
        "Hello! I'll help you create a Partnership Agreement. "
        "I'll need details about both parties, the partnership purpose, and the term. "
        "Let's start with the first party's name."
    ),
    "Software License Agreement": (
        "Hello! Let's create a Software License Agreement. "
        "I'll need details about the licensor, licensee, software, license type, and term. "
        "Let's start with the licensor's name."
    ),
    "Data Processing Agreement": (
        "Hello! I'll help you create a Data Processing Agreement (DPA). "
        "I'll need details about the data controller, data processor, processing description, and term. "
        "Let's start with the data controller's name."
    ),
    "Pilot Agreement": (
        "Hello! Let's create a Pilot Agreement. "
        "I'll need details about the provider, customer, pilot scope, duration, and governing law. "
        "Let's start with the provider's name."
    ),
    "Business Associate Agreement": (
        "Hello! I'll help you create a Business Associate Agreement (BAA) for HIPAA compliance. "
        "I'll need details about the covered entity, business associate, PHI description, and term. "
        "Let's start with the covered entity's name."
    ),
    "AI Addendum": (
        "Hello! Let's create an AI Addendum. "
        "I'll need details about the provider, customer, AI feature description, term, and governing law. "
        "Let's start with the provider's name."
    ),
}


def _build_system_prompt(template_name: str, required_fields: List[str]) -> str:
    return (
        f"You are an expert legal document assistant helping to fill in a {template_name}.\n"
        "Your task is to conversationally extract the required information from the user.\n"
        "Always populate the 'response' field with your conversational reply to the user "
        "(the message they will see in the chat) — never leave it empty.\n"
        "For each piece of information you gather, include it in the structured output.\n"
        "When all required fields are collected, set is_complete to true and provide a brief summary "
        "in the 'response' field.\n"
        "Always be professional, clear, and concise in your responses.\n"
        "IMPORTANT: Never make up information. Only fill in fields the user has explicitly provided.\n"
        f"Required fields: {', '.join(required_fields)}"
    )


def _build_system_prompt_streaming(template_name: str, required_fields: List[str]) -> str:
    return (
        f"You are an expert legal document assistant helping to fill in a {template_name}.\n"
        "Your task is to conversationally extract the required information from the user.\n"
        "Write your reply text in normal markdown. When your reply is complete, "
        "on a new line write:\n__JSON__\n"
        "Then output a valid JSON object with exactly these fields:\n"
        "- response: your conversational reply text (same as what you wrote above)\n"
        "- extracted_fields: list of {field_name, field_value, confidence} for each piece of info gathered\n"
        "- is_complete: true when all required fields have been provided\n"
        "- missing_fields: list of field names still needed\n"
        "Always include the __JSON__ marker and JSON object at the end — never omit it.\n"
        f"Required fields: {', '.join(required_fields)}"
    )


def _build_messages(
    history: List[ChatMessage],
    template_name: str,
    user_message: str,
    extracted_fields: Dict[str, str],
) -> List[Dict[str, str]]:
    required_fields = REQUIRED_FIELDS.get(template_name, [])
    system_prompt = _build_system_prompt(template_name, required_fields)

    messages = [{"role": "system", "content": system_prompt}]

    # Convert history ChatMessage objects to dicts
    for msg in history:
        messages.append({"role": msg.role, "content": msg.content})

    # Build missing fields context
    current_keys = set(extracted_fields.keys())
    all_required = set(required_fields)
    missing = [f for f in required_fields if f not in current_keys]

    # Add context about current extracted fields
    if extracted_fields or missing:
        context_parts = []
        if extracted_fields:
            context_parts.append("Current extracted fields:\n" + "\n".join(
                f"- {k}: {v}" for k, v in extracted_fields.items()
            ))
        if missing:
            context_parts.append(f"Missing fields to collect: {', '.join(missing)}")
        messages.append({
            "role": "user",
            "content": (
                f"{user_message}\n\n[Internal context: {'; '.join(context_parts)}]"
            ),
        })
    else:
        messages.append({"role": "user", "content": user_message})

    return messages


def _build_messages_streaming(
    template_name: str,
    required_fields: List[str],
    history: List[ChatMessage],
    user_message: str,
    extracted_fields: Dict[str, str],
) -> List[Dict[str, str]]:
    system_prompt = _build_system_prompt_streaming(template_name, required_fields)

    messages = [{"role": "system", "content": system_prompt}]

    for msg in history:
        messages.append({"role": msg.role, "content": msg.content})

    current_keys = set(extracted_fields.keys())
    missing = [f for f in required_fields if f not in current_keys]

    context_parts = []
    if extracted_fields:
        context_parts.append("Current extracted fields:\n" + "\n".join(
            f"- {k}: {v}" for k, v in extracted_fields.items()
        ))
    if missing:
        context_parts.append(f"Missing fields to collect: {', '.join(missing)}")

    if context_parts:
        messages.append({
            "role": "user",
            "content": f"{user_message}\n\n[Internal context: {'; '.join(context_parts)}]",
        })
    else:
        messages.append({"role": "user", "content": user_message})

    return messages


def _call_llm(messages: List[Dict[str, str]], template_name: str) -> str:
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY environment variable is not set")

    response = litellm.completion(
        model="openrouter/openai/gpt-oss-120b",
        api_key=api_key,
        messages=messages,
        temperature=0.3,
    )
    return response.choices[0].message.content


def get_greeting(template_name: str) -> GreetingResponse:
    greeting = GREETINGS.get(
        template_name,
        f"Hello! I'm here to help you create a {template_name}. "
        "I'll need some details to get started. What is the first piece of information you'd like to provide?",
    )
    return GreetingResponse(greeting=greeting)


def process_message(
    history: List[ChatMessage],
    template_name: str,
    user_message: str,
    extracted_fields: Dict[str, str],
) -> Dict[str, Any]:
    required_fields = REQUIRED_FIELDS.get(template_name, [])
    all_required_set = set(required_fields)

    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY environment variable is not set")

    messages = _build_messages(history, template_name, user_message, extracted_fields)

    response = litellm.completion(
        model="openrouter/openai/gpt-oss-120b",
        api_key=api_key,
        messages=messages,
        temperature=0.3,
        response_format=FieldExtraction,
    )

    raw_content = response.choices[0].message.content

    try:
        parsed = json.loads(raw_content)
        extraction = FieldExtraction.model_validate(parsed)
    except Exception:
        return {
            "response": raw_content or "I'm sorry, I couldn't process that. Could you try rephrasing?",
            "extracted_fields": extracted_fields,
            "is_complete": False,
            "missing_fields": list(all_required_set - set(extracted_fields.keys())),
        }

    new_extracted = dict(extracted_fields)
    for field in extraction.extracted_fields:
        new_extracted[field.field_name] = field.field_value

    current_keys = set(new_extracted.keys())
    missing = [f for f in required_fields if f not in current_keys]
    is_complete = len(missing) == 0 and len(required_fields) > 0

    return {
        "response": extraction.response or "I've collected the information. Let me confirm what I have so far.",
        "extracted_fields": new_extracted,
        "is_complete": is_complete,
        "missing_fields": missing,
    }


def process_message_stream(
    history: List[ChatMessage],
    template_name: str,
    user_message: str,
    extracted_fields: Dict[str, str],
):
    """Stream text chunks while extracting fields from the same model call.

    The model is instructed to output its reply text first, then a JSON marker
    line that contains the structured extraction. We parse both from the stream.
    """
    required_fields = REQUIRED_FIELDS.get(template_name, [])
    all_required_set = set(required_fields)

    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY environment variable is not set")

    messages = _build_messages_streaming(template_name, required_fields, history, user_message, extracted_fields)

    response = litellm.completion(
        model="openrouter/openai/gpt-oss-120b",
        api_key=api_key,
        messages=messages,
        temperature=0.3,
        stream=True,
    )

    full_text = ""
    json_buffer = ""
    in_json = False
    extraction = None

    for chunk in response:
        content = chunk.choices[0].delta.content or ""
        full_text += content

        if not in_json:
            json_start = full_text.rfind("\n__JSON__\n")
            if json_start != -1:
                in_json = True
                json_buffer = full_text[json_start + 9:]
                yield {"type": "text", "content": full_text[:json_start]}
        else:
            json_buffer += content

        if in_json and json_buffer.strip():
            try:
                parsed = json.loads(json_buffer.strip())
                extraction = FieldExtraction.model_validate(parsed)
                break
            except Exception:
                pass

    # Strip __JSON__ section from displayed response
    clean_text = full_text
    json_section_start = full_text.rfind("\n__JSON__\n")
    if json_section_start != -1:
        clean_text = full_text[:json_section_start]

    # If no JSON parsed, try a second non-streaming call with structured output
    if extraction is None:
        structured_messages = _build_messages(history, template_name, user_message, extracted_fields)
        resp = litellm.completion(
            model="openrouter/openai/gpt-oss-120b",
            api_key=api_key,
            messages=structured_messages,
            temperature=0.3,
            response_format=FieldExtraction,
        )
        raw = resp.choices[0].message.content or "{}"
        try:
            extraction = FieldExtraction.model_validate_json(raw)
        except Exception:
            pass

    # Build final result
    new_extracted = dict(extracted_fields)
    if extraction:
        for field in extraction.extracted_fields:
            new_extracted[field.field_name] = field.field_value

    current_keys = set(new_extracted.keys())
    missing = [f for f in required_fields if f not in current_keys]
    is_complete = len(missing) == 0 and len(required_fields) > 0

    yield {
        "type": "done",
        "response": clean_text if clean_text.strip() else "Done.",
        "extracted_fields": new_extracted,
        "is_complete": is_complete,
        "missing_fields": missing,
    }
